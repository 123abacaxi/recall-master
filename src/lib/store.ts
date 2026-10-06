import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Bloco } from "./recall";

export { revelarBlocos, sanitizeText, type Bloco } from "./recall";

export type Lembrete = { id: string; titulo: string; materia: string; blocos: Bloco[] };
export type Erro = { id: string; lembrete: string; materia: string; texto: string; dica: string };

const toBlocos = (raw: unknown): Bloco[] =>
  (Array.isArray(raw) ? raw : []).map((b: any) => ({
    texto: String(b.texto ?? ""),
    keywords: Array.isArray(b.keywords) ? b.keywords.map(String) : [],
    dica: String(b.dica ?? ""),
    revelado: false,
  }));

export function useLembretes() {
  return useQuery({
    queryKey: ["lembretes"],
    queryFn: async (): Promise<Lembrete[]> => {
      const { data, error } = await supabase.from("lembretes").select("id,titulo,materia,blocos").order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((l) => ({ ...l, blocos: toBlocos(l.blocos) }));
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
    mutationFn: async (l: Omit<Lembrete, "id">) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("lembretes").insert({
        user_id: u.user!.id,
        titulo: l.titulo.trim().slice(0, 200),
        materia: l.materia.trim().slice(0, 100),
        blocos: l.blocos.map(({ texto, keywords, dica }) => ({ texto, keywords, dica })),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lembretes"] }),
  });
}

export function useAddErros() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lembrete, blocos }: { lembrete: Lembrete; blocos: Bloco[] }) => {
      const rows = blocos.map((b) => ({ lembrete: lembrete.titulo, materia: lembrete.materia, texto: b.texto, dica: b.dica }));
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
