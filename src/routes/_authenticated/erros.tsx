import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AudioLines, Camera, ChevronRight, Keyboard, LoaderCircle, Plus, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/AppShell";
import { captureExamples, type ErrorOrigin } from "@/lib/error-notebook";
import { useAddErro, useErros } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/erros")({
  head: () => ({ meta: [
    { title: "Caderno de Erros — OQ lembra" },
    { name: "description", content: "Capture e compreenda erros externos com o mentor do OQ lembra." },
    { property: "og:title", content: "Caderno de Erros — OQ lembra" },
    { property: "og:description", content: "Capture, analise e transforme seus erros em aprendizado." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Erros,
});

const originLabels: Record<ErrorOrigin, string> = { manual: "Digitado", audio: "Áudio", imagem: "Imagem", revisao_legada: "Importado" };

function Erros() {
  const { data: erros = [], isLoading } = useErros();
  const add = useAddErro();
  const [texto, setTexto] = useState("");
  const [origem, setOrigem] = useState<Exclude<ErrorOrigin, "revisao_legada">>("manual");
  const [extracting, setExtracting] = useState<"audio" | "imagem" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const simulate = (kind: "audio" | "imagem") => {
    if (extracting) return;
    setExtracting(kind);
    window.setTimeout(() => {
      setTexto(captureExamples[kind]);
      setOrigem(kind);
      setExtracting(null);
      textareaRef.current?.focus();
      toast.success(kind === "audio" ? "Áudio transcrito para revisão." : "Texto extraído da imagem.");
    }, 850);
  };

  const submit = () => {
    const clean = texto.trim();
    if (!clean) { textareaRef.current?.focus(); return; }
    add.mutate({ texto: clean, origem }, {
      onSuccess: () => { setTexto(""); setOrigem("manual"); toast.success("Erro adicionado ao Caderno."); },
      onError: () => toast.error("Não foi possível adicionar este erro."),
    });
  };

  return <AppShell>
    <header><p className="text-xs font-bold uppercase text-primary">Captura externa</p><h1 className="mt-2 text-3xl font-bold text-navy">Caderno de Erros</h1><p className="mt-2 max-w-2xl text-muted-foreground">Registre questões e raciocínios que aconteceram fora das revisões.</p></header>
    <section className="capture-panel mt-8 rounded-2xl bg-card p-6 sm:p-8" aria-labelledby="capture-title">
      <div className="mb-5 flex items-center gap-3"><span className="icon-well"><TriangleAlert /></span><div><h2 id="capture-title" className="text-lg font-bold text-navy">O que deu errado?</h2><p className="text-sm text-muted-foreground">Cole o enunciado, descreva sua dúvida ou simule uma extração.</p></div></div>
      <Textarea ref={textareaRef} value={texto} onChange={(event) => { setTexto(event.target.value); setOrigem("manual"); }} placeholder="Registre o conteúdo bruto do erro, sem tentar corrigir ainda..." className="min-h-40 rounded-2xl p-5 text-base" />
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={extracting !== null} onClick={() => simulate("audio")}><AudioLines className={extracting === "audio" ? "motion-safe:animate-pulse" : ""} />{extracting === "audio" ? "Transcrevendo..." : "Gravar Áudio"}</Button>
        <Button type="button" variant="outline" disabled={extracting !== null} onClick={() => simulate("imagem")}><Camera className={extracting === "imagem" ? "motion-safe:animate-pulse" : ""} />{extracting === "imagem" ? "Extraindo..." : "Extrair de Imagem"}</Button>
        <Button type="button" variant="outline" onClick={() => textareaRef.current?.focus()}><Keyboard />Digitação manual</Button>
        <Button type="button" className="sm:ml-auto" disabled={!texto.trim() || add.isPending} onClick={submit}>{add.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Plus />}{add.isPending ? "Adicionando..." : "Adicionar ao Caderno"}</Button>
      </div>
    </section>
    <section className="mt-12" aria-labelledby="collection-title">
      <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase text-primary">Sua coleção</p><h2 id="collection-title" className="mt-2 text-2xl font-bold text-navy">Erros capturados</h2></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-navy">{erros.length}</span></div>
      {isLoading && <p className="mt-8 text-muted-foreground">Carregando...</p>}
      {!isLoading && erros.length === 0 && <div className="mt-6 rounded-2xl bg-card p-8 text-center text-muted-foreground">Seu caderno está vazio. A primeira captura aparecerá aqui.</div>}
      <div className="error-list mt-6 space-y-5">{erros.map((erro, index) => <Link key={erro.id} to="/erros/$erroId" params={{ erroId: erro.id }} className="error-card group block rounded-2xl bg-card p-6"><div className="flex items-start gap-4"><span className="error-index">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{originLabels[erro.origem]}</span><p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-navy">{erro.texto}</p></div><ChevronRight className="mt-2 h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" /></div></Link>)}</div>
    </section>
  </AppShell>;
}