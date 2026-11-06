const BASE = `Fale em português brasileiro, com sotaque neutro de São Paulo.
Leia exatamente o roteiro fornecido, sem acrescentar, resumir ou comentar nada.`;

export const PRESETS = {
  institucional: `${BASE}
Tom natural, próximo e confiante. Ritmo tranquilo, com pausas curtas.
Sem empolgação de locutor comercial.`,
  explicativa: `${BASE}
Tom didático e claro, como quem explica a um colega. Ritmo moderado,
com pausas após cada ideia e ênfase leve nos termos-chave.`,
  documental: `${BASE}
Tom sóbrio e reflexivo, voz grave e calma. Ritmo lento, pausas
generosas entre frases.`,
} as const;

export type PresetId = keyof typeof PRESETS;
export const VOICES = ["marin", "cedar", "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"] as const;
export type Voice = (typeof VOICES)[number];
