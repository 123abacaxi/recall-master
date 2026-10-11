import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export type ErrorOrigin = "manual" | "audio" | "imagem" | "revisao_legada";

export const errorExplanationPayloadSchema = z.object({
  text: z.string().trim().min(1).max(20_000),
});

export const errorExplanationResponseSchema = z.object({
  analysis: z.string().trim().min(1).max(20_000),
});

export type ErrorExplanation = z.infer<typeof errorExplanationResponseSchema>;

export function buildErrorExplanationSystemPrompt(): string {
  return [
    "Você é um preceptor sênior de clínica médica e cirurgia, especialista em preparar alunos para as provas de residência mais difíceis do Brasil.",
    "O usuário enviará um fragmento de erro: OCR de questão, transcrição de áudio confusa ou anotação manual. Ignore erros de digitação, formatação quebrada e vícios de linguagem. Vá direto ao cerne médico.",
    "Seu objetivo é corrigir a falha de raciocínio clínico, não apenas informar o gabarito. Baseie-se estritamente nas diretrizes médicas mais atualizadas. Seja extremamente conciso, com frases curtas e diretas. Não use saudações, introduções educadas, referências inventadas ou alegações de consulta em tempo real.",
    "Retorne somente Markdown, exatamente nesta estrutura: uma primeira frase explicando a confusão conceitual, se houver; depois o título ## A Realidade Clínica (Diretriz), com a conduta, diagnóstico ou critério correto de forma pontual e esquematizada; por fim o título ## Regra de Bolso (Para não errar mais), com um macete, mnemônico ou linha de raciocínio infalível.",
    "Use bullets quando houver mais de um item. Destaque em negrito os termos, doses ou critérios principais. Não crie outros títulos, seções ou conteúdo fora desses três tópicos.",
  ].join("\n\n");
}

export async function explainError(text: string): Promise<ErrorExplanation> {
  const payload = errorExplanationPayloadSchema.parse({ text });
  const { data, error } = await supabase.functions.invoke<unknown>("explain-error", { body: payload });
  if (error) {
    let message = "Não foi possível analisar este erro agora. Verifique sua sessão e tente novamente.";
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
  if (!data) throw new Error("Não foi possível analisar este erro agora. Verifique sua sessão e tente novamente.");
  try {
    return errorExplanationResponseSchema.parse(data);
  } catch {
    throw new Error("A IA retornou uma explicação que não pôde ser revisada. Tente novamente.");
  }
}
