import { useEffect, useMemo, useRef, useState } from "react";
import { fetchOptions, getToken, narrate, setToken, toMp3, type Options } from "./api";

const DEFAULT_SCRIPT = `O Invest Graham responde a uma pergunta simples: quanto uma ação da Bê Três deveria valer?

Ele busca os números da empresa, como o lucro por ação e o valor patrimonial, e aplica a fórmula de Benjamin Graham.

O resultado é uma estimativa de preço justo. Comparando com a cotação do dia, você vê a margem de segurança.`;

type Status = "idle" | "loading" | "done" | "error";
interface Take {
  status: Status;
  url?: string;
  blob?: Blob;
  error?: string;
  /** texto usado na geração, para saber se o parágrafo mudou depois */
  text?: string;
}

const splitParagraphs = (s: string) =>
  s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

export function App() {
  const [opts, setOpts] = useState<Options | null>(null);
  const [loadError, setLoadError] = useState("");
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [voice, setVoice] = useState("marin");
  const [preset, setPreset] = useState("institucional");
  const [extra, setExtra] = useState("");
  const [token, setTokenState] = useState(getToken());
  const [takes, setTakes] = useState<Record<number, Take>>({});
  const urls = useRef<string[]>([]);

  const paragraphs = useMemo(() => splitParagraphs(script), [script]);

  const load = () =>
    fetchOptions().then((o) => { setOpts(o); setLoadError(""); }).catch((e) => setLoadError(e.message));
  useEffect(() => { load(); }, []);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);

  const patch = (i: number, t: Take) => setTakes((prev) => ({ ...prev, [i]: t }));

  async function generate(i: number) {
    const text = paragraphs[i];
    patch(i, { ...takes[i], status: "loading" });
    try {
      const blob = await narrate({ text, voice, preset, extra: extra || undefined });
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      patch(i, { status: "done", url, blob, text });
    } catch (e) {
      patch(i, { status: "error", error: (e as Error).message });
    }
  }

  async function generateAll() {
    for (let i = 0; i < paragraphs.length; i++) await generate(i);
  }

  async function download(i: number, format: "wav" | "mp3") {
    const t = takes[i];
    if (!t?.blob) return;
    try {
      const blob = format === "wav" ? t.blob : await toMp3(t.blob);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `invest-graham-${String(i + 1).padStart(2, "0")}.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      patch(i, { ...t, error: (e as Error).message });
    }
  }

  const tooLong = opts ? paragraphs.findIndex((p) => p.length > opts.maxChars) : -1;

  return (
    <main>
      <h1>Narrações · Invest Graham</h1>

      {loadError && (
        <div className="box error">
          {loadError}
          <div className="row">
            <input
              type="password"
              placeholder="Token de acesso"
              value={token}
              onChange={(e) => setTokenState(e.target.value)}
            />
            <button onClick={() => { setToken(token); load(); }}>Entrar</button>
          </div>
        </div>
      )}

      <div className="row">
        <label>Voz
          <select value={voice} onChange={(e) => setVoice(e.target.value)}>
            {(opts?.voices ?? ["marin"]).map((v) => <option key={v}>{v}</option>)}
          </select>
        </label>
        <label>Preset
          <select value={preset} onChange={(e) => setPreset(e.target.value)}>
            {(opts?.presets ?? ["institucional"]).map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>

      <label>Instruções extras (opcional)
        <input
          value={extra}
          maxLength={500}
          placeholder='Ex.: pronuncie "B3" como "Bê Três"'
          onChange={(e) => setExtra(e.target.value)}
        />
      </label>

      <label>Roteiro (separe parágrafos com uma linha em branco)
        <textarea rows={10} value={script} onChange={(e) => setScript(e.target.value)} />
      </label>

      {tooLong >= 0 && <p className="error">O parágrafo {tooLong + 1} passa de {opts!.maxChars} caracteres.</p>}

      <button disabled={!opts || !paragraphs.length || tooLong >= 0} onClick={generateAll}>
        Gerar todos ({paragraphs.length})
      </button>

      <ol className="takes">
        {paragraphs.map((p, i) => {
          const t = takes[i] ?? { status: "idle" as Status };
          const stale = t.status === "done" && t.text !== p;
          return (
            <li key={i} className="box">
              <p>{p}</p>
              <div className="row">
                <button disabled={!opts || t.status === "loading"} onClick={() => generate(i)}>
                  {t.status === "loading" ? "Gerando…" : t.url ? "Refazer" : "Gerar"}
                </button>
                {t.url && <audio controls src={t.url} />}
                {t.url && <button onClick={() => download(i, "wav")}>WAV</button>}
                {t.url && <button onClick={() => download(i, "mp3")}>MP3</button>}
                {stale && <span className="warn">texto alterado desde a geração</span>}
              </div>
              {t.error && <p className="error">{t.error}</p>}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
