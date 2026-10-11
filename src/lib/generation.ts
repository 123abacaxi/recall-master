import { z } from "zod";
import type { Trecho } from "./recall";
import { supabase } from "@/integrations/supabase/client";

export const generationPayloadSchema = z.object({
  text: z.string().trim().min(1).max(20_000),
  mode: z.enum(["local", "search"]),
  granularity: z.enum(["auto", "multiple", "single_large"]),
});

const trechoSchema = z.object({
  id: z.string().trim().max(100).optional(),
  texto_original: z.string().trim().min(1).max(4_000),
  keywords: z.array(z.string().trim().min(1).max(100)).max(12),
  revelado: z.boolean().optional(),
});

export const draftSchema = z.object({
  id: z.string().trim().max(100).optional(),
  titulo: z.string().trim().min(1).max(200),
  materia: z.string().trim().min(1).max(100),
  trechos: z.array(trechoSchema).min(1).max(100),
});

export const draftsResponseSchema = z.object({ drafts: z.array(draftSchema).min(1).max(50) });

export type GenerationPayload = z.infer<typeof generationPayloadSchema>;
export type Draft = { id: string; titulo: string; materia: string; trechos: Trecho[] };

const modeInstructions = {
  local: "Modo Conteúdo de Matéria: trate o texto recebido como a fonte principal e completa. Organize, fragmente e condense o que foi escrito, preservando seu sentido e precisão. Não adicione fatos externos desnecessários nem preencha lacunas com invenções.",
  search: "Modo Pesquisa Externa: o texto recebido é um brainstorming, uma intenção ou um ponto de partida, não uma lista de regras rígidas e nem uma fonte que precise ser copiada. Interprete o que a pessoa quis estudar, escolha a melhor estrutura didática, complemente os pontos importantes e corrija imprecisões usando o conhecimento médico do modelo. Escreva uma nota dinâmica, clara e substancialmente mais completa que uma paráfrase do texto. Você pode reorganizar, expandir e conectar ideias livremente para atender ao pedido. Não alegue consulta à internet em tempo real, não invente referências ou fontes e sinalize incertezas relevantes.",
} as const;

const granularityInstructions = {
  auto: "Escolha entre agrupar trechos curtos e criar um lembrete único conforme a extensão e a complexidade do conteúdo.",
  multiple: "Produza vários lembretes curtos, cada um com foco bem delimitado e trechos revisáveis.",
  single_large: "Produza exatamente um lembrete coeso e imersivo, com vários trechos ordenados.",
} as const;

export function buildSystemPrompt(mode: GenerationPayload["mode"], granularity: GenerationPayload["granularity"]): string {
  return [
    "Você é uma organizadora cuidadosa de lembretes médicos para estudo ativo. A aprovação humana é obrigatória.",
    modeInstructions[mode],
    granularityInstructions[granularity],
    "Responda somente JSON válido, sem markdown, comentários ou texto antes/depois.",
    "O JSON deve ter exatamente a forma {\"drafts\":[{\"titulo\":string,\"materia\":string,\"trechos\":[{\"id\":string,\"texto_original\":string,\"keywords\":[string]}]}]}. Cada trecho precisa ter texto útil e ao menos uma palavra-chave útil. Não inclua referências inventadas, promessas de busca web ou campos fora desse contrato.",
    "Se algum ponto não puder ser confirmado, prefira linguagem responsável de incerteza em vez de apresentar uma suposição como fato.",
  ].join("\n\n");
}

function usefulKeywords(text: string, keywords: string[]): string[] {
  const clean = keywords.map((keyword) => keyword.trim()).filter(Boolean);
  if (clean.length) return [...new Set(clean)].slice(0, 12);
  const words = text.match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  return [...new Set(words)].slice(0, 3);
}

export function parseAndNormalizeDrafts(value: unknown): Draft[] {
  const parsed = draftsResponseSchema.parse(value);
  return parsed.drafts.map((draft, draftIndex) => ({
    id: draft.id?.trim() || `draft-${draftIndex + 1}`,
    titulo: draft.titulo.trim(),
    materia: draft.materia.trim(),
    trechos: draft.trechos.map((trecho, trechoIndex) => ({
      id: trecho.id?.trim() || `t${draftIndex + 1}-${trechoIndex + 1}`,
      texto_original: trecho.texto_original.trim(),
      keywords: usefulKeywords(trecho.texto_original, trecho.keywords),
      revelado: trecho.revelado ?? false,
    })),
  }));
}

export function parseModelJson(content: string): Draft[] {
  const withoutFence = content.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");
  return parseAndNormalizeDrafts(JSON.parse(withoutFence));
}

export async function generateNotes(payload: GenerationPayload): Promise<Draft[]> {
  const validPayload = generationPayloadSchema.parse(payload);
  const { data, error } = await supabase.functions.invoke<{ drafts: unknown }>("generate-notes", { body: validPayload });
  if (error) {
    let message = "Não foi possível gerar os lembretes agora. Verifique sua sessão e tente novamente.";
    if ("context" in error && error.context instanceof Response) {
      try {
        const body = await error.context.clone().json() as { error?: unknown };
        if (typeof body.error === "string" && body.error.trim()) message = body.error;
      } catch {
        // Keep the user-facing fallback when the function response is not JSON.
      }
    }
    throw new Error(message);
  }
  if (!data) throw new Error("Não foi possível gerar os lembretes agora. Verifique sua sessão e tente novamente.");
  try {
    return parseAndNormalizeDrafts(data);
  } catch {
    throw new Error("A IA retornou uma resposta que não pôde ser revisada. Tente novamente.");
  }
}

export function isDraftReady(draft: Draft): boolean {
  return Boolean(draft.titulo.trim() && draft.materia.trim() && draft.trechos.length && draft.trechos.every((t) => t.texto_original.trim() && t.keywords.some((k) => k.trim())));
}

export function createMockDrafts(payload: GenerationPayload): Draft[] {
  const text = payload.text.trim();
  if (!text) throw new Error("Insira um conteúdo antes de gerar.");
  const parts = payload.mode === "search" ? [`Tema solicitado: ${text}. `, "Complementação baseada no conhecimento do modelo; revise antes da aprovação."] : (text.match(/[^.!?\n]+(?:[.!?]+|\n+|$)\s*/g) ?? [text]);
  const trechos = parts.map((texto_original, i) => ({ id: `t${i + 1}`, texto_original, keywords: usefulKeywords(texto_original, []), revelado: false }));
  const size = payload.granularity === "multiple" ? 2 : payload.granularity === "single_large" ? trechos.length : Math.max(2, Math.min(4, trechos.length));
  const drafts: Draft[] = [];
  for (let i = 0; i < trechos.length; i += size) drafts.push({ id: `draft-${i}`, titulo: (payload.mode === "search" ? text : trechos[i]?.texto_original ?? text).trim().slice(0, 100), materia: "Medicina", trechos: trechos.slice(i, i + size) });
  return drafts;
}

export async function generateMockNotes(payload: GenerationPayload): Promise<Draft[]> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return createMockDrafts(payload);
}
