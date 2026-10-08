ALTER TABLE public.erros
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS analise_mentor text,
  ADD COLUMN IF NOT EXISTS texto_lembrete text;

UPDATE public.erros
SET origem = 'revisao_legada'
WHERE materia <> 'Captura externa' OR lembrete <> 'Caderno de Erros';

ALTER TABLE public.erros
  ALTER COLUMN lembrete SET DEFAULT 'Caderno de Erros',
  ALTER COLUMN materia SET DEFAULT 'Captura externa';

CREATE OR REPLACE FUNCTION public.validar_origem_erro()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.origem NOT IN ('manual', 'audio', 'imagem', 'revisao_legada') THEN
    RAISE EXCEPTION 'Origem de erro inválida';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_origem_erro_trigger ON public.erros;
CREATE TRIGGER validar_origem_erro_trigger
BEFORE INSERT OR UPDATE OF origem ON public.erros
FOR EACH ROW EXECUTE FUNCTION public.validar_origem_erro();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erros TO authenticated;
GRANT ALL ON public.erros TO service_role;