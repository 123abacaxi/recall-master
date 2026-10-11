import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Trecho } from "./recall";
import { useServerFn } from "@tanstack/react-start";
import { saveReview } from "./reviews.functions";
import { INITIAL_SRS, type SrsState } from "./srs";
import type { ErrorOrigin } from "./error-notebook";

export { revelarTrechos, sanitizeText, type Trecho } from "./recall";

export type Lembrete = { id: string; titulo: string; materia: string; trechos: Trecho[]; nextReviewAt?: string | null } & SrsState;
export type Erro = { id: string; titulo: string; texto: string; origem: ErrorOrigin; createdAt: string; analiseMentor?: string | null; textoLembrete?: string | null };

const toTrechos = (raw: unknown): Trecho[] =>
  (Array.isArray(raw) ? raw : []).map((t: any, i: number) => ({
    id: String(t.id ?? i),
    texto_original: String(t.texto_original ?? ""),
    keywords: Array.isArray(t.keywords) ? t.keywords.map(String) : [],
    revelado: false,
  }));

export function useLembretes() {
  return useQuery({
    queryKey: ["lembretes"],
    queryFn: async (): Promise<Lembrete[]> => {
      const { data, error } = await supabase.from("lembretes").select("id,titulo,materia,trechos").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: reviews, error: reviewError } = await supabase.from("revisoes").select("lembrete_id,ease_factor,interval,repetitions,next_review_at");
      if (reviewError) throw reviewError;
      return data.map((l) => {
        const review = reviews.find((r) => r.lembrete_id === l.id);
        return { ...l, trechos: toTrechos(l.trechos), ...INITIAL_SRS,
          ...(review ? { easeFactor: review.ease_factor, interval: review.interval, repetitions: review.repetitions, nextReviewAt: review.next_review_at } : {}),
        };
      });
    },
  });
}

export function useErros() {
  return useQuery({
    queryKey: ["erros"],
    queryFn: async (): Promise<Erro[]> => {
      const { data, error } = await supabase.from("erros").select("id,titulo,texto,origem,created_at,analise_mentor,texto_lembrete").order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((row) => ({ id: row.id, titulo: row.titulo ?? "", texto: row.texto, origem: row.origem as ErrorOrigin, createdAt: row.created_at, analiseMentor: row.analise_mentor, textoLembrete: row.texto_lembrete }));
    },
  });
}

export function useAddLembrete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (l: Pick<Lembrete, "titulo" | "materia" | "trechos">) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Entre novamente para salvar seu lembrete.");
      const { error } = await supabase.from("lembretes").insert({
        user_id: u.user.id,
        titulo: l.titulo.trim().slice(0, 200),
        materia: l.materia.trim().slice(0, 100),
        trechos: l.trechos.map(({ id, texto_original, keywords }) => ({ id, texto_original, keywords })),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lembretes"] }),
  });
}

export function useAddErro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ texto, origem }: { texto: string; origem: Exclude<ErrorOrigin, "revisao_legada"> }) => {
      const { error } = await supabase.from("erros").insert({ texto: texto.trim(), origem });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erros"] }),
  });
}

export function useUpdateErro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, titulo, texto, analiseMentor, textoLembrete }: { id: string; titulo: string; texto: string; analiseMentor?: string; textoLembrete?: string }) => {
      const { error } = await supabase.from("erros").update({
        titulo: titulo.trim().slice(0, 200),
        texto: texto.trim(),
        ...(analiseMentor !== undefined ? { analise_mentor: analiseMentor } : {}),
        ...(textoLembrete !== undefined ? { texto_lembrete: textoLembrete } : {}),
      } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erros"] }),
  });
}

export function useRemoveErro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("erros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erros"] }),
  });
}

export function useSaveReview() {
  const qc = useQueryClient();
  const save = useServerFn(saveReview);
  return useMutation({
    mutationFn: (data: Parameters<typeof saveReview>[0]["data"]) => save({ data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lembretes"] }),
  });
}
