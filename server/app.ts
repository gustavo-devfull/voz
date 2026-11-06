import express from "express";
import { pcmToWav, wavToMp3 } from "./audio.js";
import { PRESETS, VOICES, type PresetId } from "./presets.js";
import { narrate } from "./realtime.js";

const model = process.env.REALTIME_MODEL ?? "gpt-realtime-2.1-mini";
const MAX_CHARS = 2000;
const MAX_CONCURRENT = 3;

export const app = express();
app.use(express.json({ limit: "50kb" }));

app.use("/api", (req, res, next) => {
  const appToken = process.env.APP_TOKEN;
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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return void res.status(500).json({ error: "OPENAI_API_KEY não configurada no servidor." });

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
