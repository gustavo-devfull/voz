import WebSocket from "ws";

export interface NarrateOptions {
  text: string;
  instructions: string;
  voice: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
}

/** Gera a narração via Realtime API e devolve PCM 16-bit, 24 kHz, mono. */
export function narrate(opts: NarrateOptions): Promise<Buffer> {
  const { text, instructions, voice, apiKey, model, timeoutMs = 90_000 } = opts;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (err: Error | null, pcm?: Buffer) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ws.close();
      err ? reject(err) : resolve(pcm!);
    };
    const timer = setTimeout(() => finish(new Error("Tempo esgotado ao gerar a narração.")), timeoutMs);

    ws.on("error", (e) => finish(e));
    ws.on("close", () => finish(new Error("Conexão encerrada antes da conclusão.")));

    ws.on("message", (raw) => {
      try {
        const event = JSON.parse(raw.toString());
        switch (event.type) {
          case "session.created":
            ws.send(
              JSON.stringify({
                type: "session.update",
                session: {
                  type: "realtime",
                  instructions,
                  audio: { output: { voice, format: { type: "audio/pcm", rate: 24000 } } },
                },
              }),
            );
            break;
          case "session.updated":
            ws.send(
              JSON.stringify({
                type: "response.create",
                response: {
                  output_modalities: ["audio"],
                  input: [
                    {
                      type: "message",
                      role: "user",
                      content: [{ type: "input_text", text: `Narre este roteiro exatamente:\n${text}` }],
                    },
                  ],
                },
              }),
            );
            break;
          case "response.output_audio.delta":
            chunks.push(Buffer.from(event.delta, "base64"));
            break;
          case "response.done":
            if (event.response?.status !== "completed" || !chunks.length) {
              finish(new Error("A narração não foi concluída."));
            } else {
              finish(null, Buffer.concat(chunks));
            }
            break;
          case "error":
            finish(new Error(event.error?.message ?? "Erro da API Realtime."));
            break;
        }
      } catch (e) {
        finish(e as Error);
      }
    });
  });
}
