CREATE TABLE public.revisoes (
 user_id uuid NOT NULL DEFAULT auth.uid(), lembrete_id uuid NOT NULL REFERENCES public.lembretes(id) ON DELETE CASCADE,
 ease_factor double precision NOT NULL DEFAULT 2.5, interval integer NOT NULL DEFAULT 0, repetitions integer NOT NULL DEFAULT 0,
 next_review_at timestamptz, quality_score integer, time_taken double precision, hints_used integer,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id, lembrete_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revisoes TO authenticated;
GRANT ALL ON public.revisoes TO service_role;
ALTER TABLE public.revisoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agenda individual" ON public.revisoes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.lembretes l WHERE l.id = lembrete_id));
CREATE TRIGGER revisoes_updated BEFORE UPDATE ON public.revisoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.sessoes_revisao (
 id uuid PRIMARY KEY, user_id uuid NOT NULL DEFAULT auth.uid(), lembrete_id uuid NOT NULL REFERENCES public.lembretes(id) ON DELETE CASCADE,
 result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sessoes_revisao TO authenticated;
GRANT ALL ON public.sessoes_revisao TO service_role;
ALTER TABLE public.sessoes_revisao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ler próprias sessões" ON public.sessoes_revisao FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Registrar próprias sessões" ON public.sessoes_revisao FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.lembretes l WHERE l.id = lembrete_id));
CREATE TRIGGER sessoes_revisao_updated BEFORE UPDATE ON public.sessoes_revisao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE FUNCTION public.registrar_revisao(p_session uuid, p_lembrete uuid, p_quality integer, p_time double precision, p_hints integer) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE r public.revisoes%ROWTYPE; saved jsonb; n_interval integer; n_reps integer; n_ease double precision; total integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT jsonb_array_length(trechos) INTO total FROM public.lembretes WHERE id = p_lembrete;
 IF total IS NULL OR total < 1 OR p_quality NOT BETWEEN 0 AND 5 OR p_time < 0 OR p_hints NOT BETWEEN 0 AND total THEN RAISE EXCEPTION 'Invalid review'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || p_lembrete::text, 0));
 SELECT result INTO saved FROM public.sessoes_revisao WHERE id = p_session AND user_id = auth.uid() AND lembrete_id = p_lembrete;
 IF saved IS NOT NULL THEN RETURN saved; END IF;
 INSERT INTO public.revisoes(user_id, lembrete_id) VALUES(auth.uid(), p_lembrete) ON CONFLICT DO NOTHING;
 SELECT * INTO r FROM public.revisoes WHERE user_id = auth.uid() AND lembrete_id = p_lembrete FOR UPDATE;
 n_ease := greatest(1.3, r.ease_factor + (0.1 - (5-p_quality)*(0.08+(5-p_quality)*0.02)));
 IF p_quality < 3 THEN n_interval := 1; n_reps := 0;
 ELSE n_reps := r.repetitions + 1;
  n_interval := CASE WHEN r.repetitions = 0 THEN 1 WHEN r.repetitions = 1 THEN 6 ELSE greatest(1, round(r.interval*r.ease_factor)::integer) END;
 END IF;
 UPDATE public.revisoes SET ease_factor = n_ease, interval = n_interval, repetitions = n_reps, next_review_at = now() + make_interval(days => n_interval), quality_score = p_quality, time_taken = p_time, hints_used = p_hints WHERE user_id = auth.uid() AND lembrete_id = p_lembrete RETURNING * INTO r;
 saved := to_jsonb(r);
 INSERT INTO public.sessoes_revisao(id, user_id, lembrete_id, result) VALUES(p_session, auth.uid(), p_lembrete, saved);
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.registrar_revisao(uuid,uuid,integer,double precision,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_revisao(uuid,uuid,integer,double precision,integer) TO authenticated;