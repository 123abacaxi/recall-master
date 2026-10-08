import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Brain, Check, Copy, Lightbulb, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { createMentorAnalysis } from "@/lib/error-notebook";
import { useErros, useRemoveErro } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/erros/$erroId")({
  head: () => ({ meta: [
    { title: "Entender erro — OQ lembra" },
    { name: "description", content: "Analise um erro e transforme o aprendizado em uma Carta Borrada." },
    { property: "og:title", content: "Entender erro — OQ lembra" },
    { property: "og:description", content: "Analise um erro e prepare um novo lembrete." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ErroDetail,
});

function ErroDetail() {
  const { erroId } = Route.useParams();
  const { data: erros = [], isLoading } = useErros();
  const remove = useRemoveErro();
  const erro = erros.find((item) => item.id === erroId);
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  if (isLoading) return <AppShell><p className="text-muted-foreground">Carregando...</p></AppShell>;
  if (!erro) return <AppShell><h1 className="text-2xl font-bold text-navy">Erro não encontrado</h1><Button asChild variant="outline" className="mt-6"><Link to="/erros"><ArrowLeft />Voltar ao Caderno</Link></Button></AppShell>;
  const mentor = createMentorAnalysis(erro.texto);
  const explain = () => { if (open) { setOpen(false); return; } setAnalyzing(true); window.setTimeout(() => { setAnalyzing(false); setOpen(true); }, 700); };
  const copyReminder = async () => {
    try { await navigator.clipboard.writeText(mentor.reminderText); toast.success("Texto copiado! Vá para a aba Criar Lembretes para gerar sua Carta Borrada"); }
    catch { toast.error("Não foi possível copiar o texto."); }
  };

  return <AppShell><Button asChild variant="ghost" className="px-0 hover:bg-transparent"><Link to="/erros"><ArrowLeft />Voltar ao Caderno</Link></Button>
    <article className="error-detail mt-6 rounded-2xl bg-card p-6 sm:p-10"><div className="flex items-center gap-3"><span className="icon-well text-destructive"><Brain /></span><span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">Em análise</span></div><h1 className="mt-8 text-2xl font-bold text-navy">Erro capturado</h1><p className="mt-5 whitespace-pre-wrap text-lg leading-relaxed text-navy">{erro.texto}</p>
      <footer className="mt-10 flex flex-wrap gap-3 border-t pt-6"><Button type="button" variant="navy" onClick={explain}>{analyzing ? <LoaderCircle className="motion-safe:animate-spin" /> : <Lightbulb />}{analyzing ? "Analisando..." : open ? "Ocultar análise" : "Entender este Erro (IA)"}</Button><Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={remove.isPending} onClick={() => remove.mutate(erro.id, { onSuccess: () => toast.success("Erro removido.") })}><Trash2 />Excluir</Button></footer>
      <div className={`mentor-panel ${open ? "is-open" : ""}`} aria-hidden={!open}><div className="mentor-panel-inner"><div className="rounded-2xl bg-muted/50 p-6 sm:p-8"><div className="flex items-center gap-3 text-success"><Check className="h-5 w-5" /><h2 className="text-lg font-bold text-navy">Considerações do Mentor</h2></div><p className="mt-5 leading-relaxed text-navy">{mentor.analysis}</p><Button type="button" variant="outline" className="mt-6 border-success/30 text-success" onClick={() => void copyReminder()}><Copy />Transformar em Lembrete</Button></div></div></div>
    </article>
  </AppShell>;
}