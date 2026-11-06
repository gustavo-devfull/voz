# Voz — gerador de narrações (Invest Graham)

React + TypeScript (frontend) · Node.js/Express (backend) · OpenAI Realtime API (`gpt-realtime-2.1-mini`, via WebSocket).

## Uso

```bash
cp .env.example .env   # preencha OPENAI_API_KEY
npm install
export $(grep -v '^#' .env | xargs) && npm run dev   # API :3001, web :5173
```

Produção: `npm run build && npm start` (o Express serve `web/dist`).

## Recursos

- Roteiro dividido por parágrafo (linha em branco): gere, ouça e **refaça só um trecho**.
- Presets de narração (institucional, explicativa, documental) em `server/presets.ts`, mais instruções extras.
- Exportação WAV (24 kHz mono) e MP3 (requer `ffmpeg` no servidor).
- A chave da OpenAI fica só no backend; `APP_TOKEN` opcional protege a API.
- Validação de entrada, limite de 2000 caracteres/trecho, 3 gerações simultâneas e timeout de 90 s.

## Pendências

Teste real contra a API (precisa de chave), ajuste fino de pronúncia ("B3" → "Bê Três") e autenticação por usuário.
