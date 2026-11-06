export interface Options {
  voices: string[];
  presets: string[];
  maxChars: number;
}

export const getToken = () => localStorage.getItem("app-token") ?? "";
export const setToken = (t: string) => localStorage.setItem("app-token", t);

const headers = () => ({ "content-type": "application/json", "x-app-token": getToken() });

export async function fetchOptions(): Promise<Options> {
  const r = await fetch("/api/options", { headers: headers() });
  if (!r.ok) throw new Error((await r.json()).error ?? "Falha ao carregar opções.");
  return r.json();
}

export async function narrate(body: {
  text: string;
  voice: string;
  preset: string;
  extra?: string;
}): Promise<Blob> {
  const r = await fetch("/api/narrate", { method: "POST", headers: headers(), body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Falha ao gerar a narração.");
  return r.blob();
}

export async function toMp3(wav: Blob): Promise<Blob> {
  const r = await fetch("/api/mp3", { method: "POST", headers: { "content-type": "audio/wav", "x-app-token": getToken() }, body: wav });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Falha ao converter para MP3.");
  return r.blob();
}
