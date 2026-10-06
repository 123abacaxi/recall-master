import type { Trecho } from "./recall";

export type GenerationPayload = {
  text: string;
  mode: "local" | "search";
  granularity: "auto" | "multiple" | "single_large";
};
export type Draft = { id: string; titulo: string; materia: string; trechos: Trecho[] };

export function createMockDrafts(payload: GenerationPayload): Draft[] {
  const text = payload.text.trim();
  if (!text) throw new Error("Insira um conteúdo antes de gerar.");
  // Search remains a mock: never present invented medical guidance as research.
  const parts = payload.mode === "search"
    ? [`Tema solicitado: ${text}. `, "Pesquisa externa simulada; conteúdo e fontes ainda precisam ser adicionados antes da aprovação."]
    : (text.match(/[^.!?\n]+(?:[.!?]+|\n+|$)\s*/g) ?? [text]);
  const trechos = parts.map((texto_original, i) => ({
    id: `t${i + 1}`,
    texto_original,
    keywords: [...new Set(texto_original.match(/[\p{L}\p{N}]+/gu) ?? [])].filter((word) => word.length > 4).slice(0, 3),
    revelado: false,
  }));
  const size = payload.granularity === "multiple" ? 2 : payload.granularity === "single_large" ? trechos.length : Math.max(2, Math.min(4, trechos.length));
  const drafts: Draft[] = [];
  for (let i = 0; i < trechos.length; i += size) {
    const group = trechos.slice(i, i + size);
    drafts.push({
      id: `draft-${i}`,
      titulo: (payload.mode === "search" ? text : group[0]?.texto_original ?? text).trim().slice(0, 100),
      materia: "Medicina",
      trechos: group,
    });
  }
  return drafts;
}

export function isDraftReady(draft: Draft): boolean {
  return Boolean(draft.titulo.trim() && draft.materia.trim() && draft.trechos.length && draft.trechos.every((t) => t.texto_original.trim() && t.keywords.some((k) => k.trim())));
}

export async function generateMockNotes(payload: GenerationPayload): Promise<Draft[]> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return createMockDrafts(payload);
}