import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pcmToWav, wavToMp3 } from "./audio.js";
import { PRESETS, VOICES, type PresetId } from "./presets.js";
import { narrate } from "./realtime.js";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Defina OPENAI_API_KEY.");
  process.exit(1);
}
const model = process.env.REALTIME_MODEL ?? "gpt-realtime-2.1-mini";
const appToken = process.env.APP_TOKEN;
const MAX_CHARS = 2000;
const MAX_CONCURRENT = 3;

const app = express();
app.use(express.json({ limit: "50kb" }));

app.use("/api", (req, res, next) => {
  if (appToken && req.header("x-app-token") !== appToken) {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }
  next();
});

app.get("/api/options", (_req, res) => {
  res.json({ voices: VOICES, presets: Object.keys(PRESETS), maxChars: MAX_CHARS });
});

let active = 0;

app.post("/api/narrate", async (req, res) => {
  const { text, voice = "marin", preset = "institucional", extra } = req.body ?? {};

  if (typeof text !== "string" || !text.trim()) return void res.status(400).json({ error: "Texto vazio." });
  if (text.length > MAX_CHARS) return void res.status(400).json({ error: `Máximo de ${MAX_CHARS} caracteres por trecho.` });
  if (!(VOICES as readonly string[]).includes(voice)) return void res.status(400).json({ error: "Voz inválida." });
  if (!(preset in PRESETS)) return void res.status(400).json({ error: "Preset inválido." });
  if (extra !== undefined && (typeof extra !== "string" || extra.length > 500))
    return void res.status(400).json({ error: "Instruções extras inválidas." });
  if (active >= MAX_CONCURRENT) return void res.status(429).json({ error: "Servidor ocupado, tente novamente." });

  active++;
  try {
    const instructions = PRESETS[preset as PresetId] + (extra ? `\n${extra}` : "");
    const pcm = await narrate({ text: text.trim(), instructions, voice, apiKey, model });
    res.type("audio/wav").send(pcmToWav(pcm));
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: (e as Error).message });
  } finally {
    active--;
  }
});

// Converte um WAV já gerado em MP3 (o take ouvido é o mesmo que se baixa).
app.post("/api/mp3", express.raw({ type: "audio/wav", limit: "20mb" }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length < 44) return void res.status(400).json({ error: "WAV inválido." });
  try {
    res.type("audio/mpeg").send(await wavToMp3(req.body));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

const dist = resolve("web/dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(resolve(dist, "index.html")));
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API em http://localhost:${port} (modelo ${model})`));
