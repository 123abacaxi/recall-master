import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calculateQualityScore } from "./srs";

const input = z.object({
  sessionId: z.uuid(), lembreteId: z.uuid(),
  hintsUsed: z.number().int().nonnegative(), timeTaken: z.number().finite().nonnegative(),
  abandoned: z.boolean(),
});
const result = z.object({
  ease_factor: z.number(), interval: z.number(), repetitions: z.number(),
  next_review_at: z.string(), quality_score: z.number(), time_taken: z.number(), hints_used: z.number(),
});

export const saveReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    const { data: note, error: noteError } = await context.supabase.from("lembretes").select("trechos").eq("id", data.lembreteId).single();
    if (noteError || !note || !Array.isArray(note.trechos) || note.trechos.length === 0) throw new Error("Lembrete indisponível.");
    if (data.hintsUsed > note.trechos.length) throw new Error("Contagem de dicas inválida.");
    const quality = data.abandoned ? 0 : calculateQualityScore(data.hintsUsed, note.trechos.length, data.timeTaken);
    const { data: saved, error } = await context.supabase.rpc("registrar_revisao", {
      p_session: data.sessionId, p_lembrete: data.lembreteId, p_quality: quality,
      p_time: data.timeTaken, p_hints: data.hintsUsed,
    });
    if (error) throw new Error("Não foi possível salvar o agendamento.");
    return result.parse(saved);
  });