export type Trecho = { id: string; texto_original: string; keywords: string[]; revelado: boolean };

export type RecallState = { trechos: Trecho[]; hintsUsed: number };

export function revelarComDica(state: RecallState, id: string): RecallState {
  if (!state.trechos.some((trecho) => trecho.id === id && !trecho.revelado)) return state;
  return {
    hintsUsed: state.hintsUsed + 1,
    trechos: state.trechos.map((trecho) => trecho.id === id ? { ...trecho, revelado: true } : trecho),
  };
}

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function sanitizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Connectives / filler ignored when spotting keywords.
const STOPWORDS = new Set(
  "a o as os e de da do das dos em no na nos nas um uma uns umas por para com sem que se ou ao aos pelo pela pelos pelas é eh tipo ne entao assim tipo ah hum".split(" ").map(sanitizeText),
);

/** True when every meaningful token of the keyword appears somewhere in the input (order-free). */
export function matchKeyword(input: string, keyword: string): boolean {
  const t = sanitizeText(input);
  const tokens = sanitizeText(keyword).split(" ").filter((w) => w && !STOPWORDS.has(w));
  return tokens.length > 0 && tokens.every((w) => t.includes(w));
}

export function revelarTrechos(trechos: Trecho[], digitado: string): Trecho[] {
  if (!sanitizeText(digitado)) return trechos;
  return trechos.map((b) =>
    b.revelado || !b.keywords.some((k) => matchKeyword(digitado, k)) ? b : { ...b, revelado: true },
  );
}
