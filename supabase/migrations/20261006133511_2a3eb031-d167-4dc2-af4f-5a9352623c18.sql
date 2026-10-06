CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.lembretes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  titulo text NOT NULL,
  materia text NOT NULL,
  blocos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lembretes TO authenticated;
GRANT ALL ON public.lembretes TO service_role;
ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver exemplos e próprios" ON public.lembretes FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Criar próprios" ON public.lembretes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Editar próprios" ON public.lembretes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Apagar próprios" ON public.lembretes FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER lembretes_updated BEFORE UPDATE ON public.lembretes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.erros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  lembrete text NOT NULL,
  materia text NOT NULL,
  texto text NOT NULL,
  dica text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, texto)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.erros TO authenticated;
GRANT ALL ON public.erros TO service_role;
ALTER TABLE public.erros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerenciar próprios erros" ON public.erros FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER erros_updated BEFORE UPDATE ON public.erros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.lembretes (titulo, materia, blocos) VALUES
('Insuficiência Cardíaca','Cardiologia','[
 {"texto":"Principal causa: doença arterial coronariana","keywords":["coronariana","coronária"],"dica":"Pense nas artérias do coração"},
 {"texto":"Classificação funcional pela NYHA (I a IV)","keywords":["NYHA"],"dica":"Sigla de uma associação de Nova York"},
 {"texto":"BNP elevado sugere disfunção ventricular","keywords":["BNP"],"dica":"Peptídeo natriurético"},
 {"texto":"Tratamento base: IECA + betabloqueador","keywords":["IECA","betabloqueador"],"dica":"Duas classes que reduzem mortalidade"}]'::jsonb),
('Diabetes Mellitus tipo 2','Endocrinologia','[
 {"texto":"Diagnóstico: glicemia de jejum ≥ 126 mg/dL","keywords":["126"],"dica":"Número entre 120 e 130"},
 {"texto":"HbA1c ≥ 6,5% confirma o diagnóstico","keywords":["6,5","hemoglobina glicada"],"dica":"Seis e meio"},
 {"texto":"Primeira linha: metformina","keywords":["metformina"],"dica":"Biguanida"}]'::jsonb),
('Pneumonia Comunitária','Pneumologia','[
 {"texto":"Agente mais comum: Streptococcus pneumoniae","keywords":["pneumoniae","pneumococo"],"dica":"Diplococo gram-positivo"},
 {"texto":"Escore de gravidade: CURB-65","keywords":["CURB"],"dica":"Confusão, Ureia, Respiração..."}]'::jsonb);