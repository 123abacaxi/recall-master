import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Trecho } from "./recall";
import { useServerFn } from "@tanstack/react-start";
import { saveReview } from "./reviews.functions";
import { INITIAL_SRS, type SrsState } from "./srs";

export { revelarTrechos, sanitizeText, type Trecho } from "./recall";

export type Lembrete = { id: string; titulo: string; materia: string; trechos: Trecho[]; nextReviewAt?: string | null } & SrsState;
export type Erro = { id: string; lembrete: string; materia: string; texto: string; dica: string };

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
      const { data, error } = await supabase.from("erros").select("id,lembrete,materia,texto,dica").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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

export function useAddErros() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lembrete, trechos }: { lembrete: Lembrete; trechos: Trecho[] }) => {
      const rows = trechos.map((t) => ({ lembrete: lembrete.titulo, materia: lembrete.materia, texto: t.texto_original.trim(), dica: t.keywords.join(", ") }));
      const { error } = await supabase.from("erros").upsert(rows, { onConflict: "user_id,texto", ignoreDuplicates: true });
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
