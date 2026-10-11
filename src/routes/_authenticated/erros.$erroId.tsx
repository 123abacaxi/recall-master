import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Brain, Check, Copy, Lightbulb, LoaderCircle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { explainError } from "@/lib/error-notebook";
import { useErros, useRemoveErro, useUpdateErro } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/erros/$erroId")({
  head: () => ({ meta: [
    { title: "Entender erro — OQ lembra" },
    { name: "description", content: "Edite e compreenda seu erro com o preceptor de clínica médica e cirurgia." },
    { property: "og:title", content: "Entender erro — OQ lembra" },
    { property: "og:description", content: "Corrija a falha de raciocínio clínico e fixe a regra de bolso." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ErroDetail,
});

function MarkdownContent({ markdown }: { markdown: string }) {
  const renderInline = (text: string) => text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : <span key={index}>{part}</span>);

  return <div className="space-y-3 leading-relaxed text-navy">
    {markdown.split("\n").map((line, index) => {
      if (line.startsWith("## ")) return <h3 key={index} className="pt-3 text-lg font-bold text-navy">{renderInline(line.slice(3))}</h3>;
      if (line.startsWith("- ")) return <div key={index} className="flex gap-2 pl-2"><span aria-hidden="true">•</span><span>{renderInline(line.slice(2))}</span></div>;
      if (!line.trim()) return <div key={index} className="h-1" aria-hidden="true" />;
      return <p key={index}>{renderInline(line)}</p>;
    })}
  </div>;
}

function ErroDetail() {
  const { erroId } = Route.useParams();
  const { data: erros = [], isLoading } = useErros();
  const remove = useRemoveErro();
  const update = useUpdateErro();
  const erro = erros.find((item) => item.id === erroId);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (erro) {
      setTitulo(erro.titulo);
      setTexto(erro.texto);
      setAnalysis(erro.analiseMentor ?? null);
      setOpen(Boolean(erro.analiseMentor));
    }
  }, [erro?.id, erro?.titulo, erro?.texto, erro?.analiseMentor]);

  if (isLoading) return <AppShell><p className="text-muted-foreground">Carregando...</p></AppShell>;
  if (!erro) return <AppShell><h1 className="text-2xl font-bold text-navy">Erro não encontrado</h1><Button asChild variant="outline" className="mt-6"><Link to="/erros"><ArrowLeft />Voltar ao Caderno</Link></Button></AppShell>;

  const dirty = titulo.trim() !== erro.titulo || texto.trim() !== erro.texto;
  const copyText = `${titulo.trim() ? `${titulo.trim()}\n\n` : ""}${analysis ?? ""}`;
  const save = () => {
    if (!texto.trim()) { toast.error("O conteúdo do erro não pode ficar vazio."); return; }
    update.mutate({ id: erro.id, titulo, texto }, { onSuccess: () => toast.success("Erro atualizado."), onError: () => toast.error("Não foi possível salvar.") });
  };
  const explain = async () => {
    if (open) { setOpen(false); return; }
    if (!texto.trim()) { toast.error("O conteúdo do erro não pode ficar vazio."); return; }
    setAnalyzing(true);
    try {
      const result = await explainError(texto);
      setAnalysis(result.analysis);
      setOpen(true);
      update.mutate({ id: erro.id, titulo, texto, analiseMentor: result.analysis, textoLembrete: result.analysis }, { onError: () => toast.error("Análise exibida, mas não foi possível salvá-la.") });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível analisar este erro agora.");
    } finally { setAnalyzing(false); }
  };
  const copyReminder = async () => {
    try { await navigator.clipboard.writeText(copyText); toast.success("Texto copiado! Vá para a aba Criar Lembretes para gerar sua Carta Borrada"); }
    catch { toast.error("Não foi possível copiar o texto."); }
  };

  return <AppShell><Button asChild variant="ghost" className="px-0 hover:bg-transparent"><Link to="/erros"><ArrowLeft />Voltar ao Caderno</Link></Button>
    <article className="error-detail mt-6 rounded-2xl bg-card p-6 sm:p-10">
      <div className="flex items-center gap-3"><span className="icon-well text-destructive"><Brain /></span><span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">Em análise</span></div>
      <label className="mt-8 block text-xs font-bold uppercase text-primary" htmlFor="erro-titulo">Título</label>
      <Input id="erro-titulo" value={titulo} maxLength={200} onChange={(e) => setTitulo(e.target.value)} placeholder="Dê um título a este erro (ex: Critérios de Duke)" className="mt-2 h-12 rounded-2xl text-lg font-bold text-navy" />
      <label className="mt-6 block text-xs font-bold uppercase text-primary" htmlFor="erro-texto">Conteúdo do erro</label>
      <Textarea id="erro-texto" value={texto} onChange={(e) => setTexto(e.target.value)} className="mt-2 min-h-40 rounded-2xl p-5 text-base leading-relaxed text-navy" />
      <footer className="mt-8 flex flex-wrap gap-3 border-t pt-6">
        <Button type="button" variant="navy" onClick={() => void explain()} disabled={analyzing}>{analyzing ? <LoaderCircle className="motion-safe:animate-spin" /> : <Lightbulb />}{analyzing ? "Analisando..." : open ? "Ocultar análise" : "Entender este Erro (IA)"}</Button>
        <Button type="button" variant="outline" disabled={!dirty || update.isPending} onClick={save}>{update.isPending ? <LoaderCircle className="motion-safe:animate-spin" /> : <Save />}Salvar alterações</Button>
        <Button type="button" variant="ghost" className="sm:ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={remove.isPending} onClick={() => remove.mutate(erro.id, { onSuccess: () => toast.success("Erro removido.") })}><Trash2 />Excluir</Button>
      </footer>
      <div className={`mentor-panel ${open && analysis ? "is-open" : ""}`} aria-hidden={!open || !analysis}><div className="mentor-panel-inner"><div className="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <div className="flex items-center gap-3 text-success"><Check className="h-5 w-5" /><h2 className="text-lg font-bold text-navy">Considerações do Mentor</h2></div>
        {analysis && <div className="mt-5"><MarkdownContent markdown={analysis} /></div>}
        <Button type="button" variant="outline" className="mt-6 border-success/30 text-success" disabled={!analysis} onClick={() => void copyReminder()}><Copy />Copiar para criar Lembrete</Button>
      </div></div></div>
    </article>
  </AppShell>;
}
