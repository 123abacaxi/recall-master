import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Mic, Flag, Eye, Star, Clock, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/AppShell";
import { useLembretes, useAddErros, useSaveReview, revelarTrechos, type Lembrete } from "@/lib/store";
import { revelarComDica } from "@/lib/recall";
import { calculateQualityScore } from "@/lib/srs";

export const Route = createFileRoute("/_authenticated/revisar")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Revisar — OQ lembra" },
      { name: "description", content: "Modo estudo com active recall: digite o que lembra e revele a nota." },
      { property: "og:title", content: "Revisar — OQ lembra" },
      { property: "og:description", content: "Digite o que lembra e revele a nota." },
    ],
  }),
  component: Revisar,
});

function Revisar() {
  const { data: lembretes = [], isLoading } = useLembretes();
  const [ativo, setAtivo] = useState<Lembrete | null>(null);

  return (
    <AppShell>
      {ativo ? (
        <ModoEstudo key={ativo.id} lembrete={ativo} onVoltar={() => setAtivo(null)} />
      ) : (
        <>
          <h1 className="text-3xl font-extrabold text-navy">Revisar</h1>
          <p className="mt-1 text-muted-foreground">Escolha um lembrete e teste sua memória.</p>
          {isLoading && <p className="mt-8 text-muted-foreground">Carregando...</p>}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {lembretes.map((l) => (
              <button
                key={l.id}
                onClick={() => setAtivo(l)}
                className="group rounded-2xl bg-card p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{l.materia}</span>
                <h2 className="mt-4 text-lg font-bold text-navy">{l.titulo}</h2>
                <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{l.trechos.length} trechos</span>
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={1.75} />
                </div>
                {l.nextReviewAt && <p className="mt-3 text-xs text-primary">Próxima revisão: {new Date(l.nextReviewAt).toLocaleDateString("pt-BR")}</p>}
              </button>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

function ModoEstudo({ lembrete, onVoltar }: { lembrete: Lembrete; onVoltar: () => void }) {
  const [study, setStudy] = useState(() => ({
    trechos: lembrete.trechos.map((t) => ({ ...t, revelado: false })),
    hintsUsed: 0,
  }));
  const { trechos, hintsUsed } = study;
  const startTime = useRef<number | null>(null);
  const abandoned = useRef(false);
  const completed = useRef(false);
  const sessionId = useRef<string | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [completion, setCompletion] = useState<{ quality: number; timeTaken: number; hintsUsed: number; abandoned: boolean } | null>(null);
  const save = useSaveReview();
  const [texto, setTexto] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const recRef = useRef<any>(null);
  const addErros = useAddErros();
  const revelados = trechos.filter((b) => b.revelado).length;

  useEffect(() => {
    startTime.current = performance.now();
    sessionId.current = crypto.randomUUID();
    return () => {
      recRef.current?.stop();
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

  useEffect(() => {
    if (completed.current || trechos.length === 0 || revelados !== trechos.length || startTime.current === null || !sessionId.current) return;
    completed.current = true;
    const timeTaken = Math.max(0, (performance.now() - startTime.current) / 1000);
    const quality = abandoned.current ? 0 : calculateQualityScore(hintsUsed, trechos.length, timeTaken);
    const result = { quality, timeTaken, hintsUsed, abandoned: abandoned.current };
    setCompletion(result);
    recRef.current?.stop();
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setTexto("");
    save.mutate({ sessionId: sessionId.current, lembreteId: lembrete.id, timeTaken, hintsUsed, abandoned: abandoned.current });
  }, [revelados, trechos.length, hintsUsed, lembrete.id, save.mutate]);

  const handle = (v: string) => {
    if (completed.current) return;
    setTexto(v);
    const next = revelarTrechos(trechos, v);
    if (next.some((b, i) => b.revelado && !trechos[i]?.revelado)) {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => setTexto(""), 400);
    }
    setStudy((prev) => ({ ...prev, trechos: revelarTrechos(prev.trechos, v) }));
  };

  const mic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error("Seu navegador não suporta reconhecimento de voz.");
    if (ouvindo) return recRef.current?.stop();
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e: any) => handle(Array.from(e.results).map((r: any) => r[0].transcript).join(" "));
    rec.onend = () => setOuvindo(false);
    rec.start();
    recRef.current = rec;
    setOuvindo(true);
  };

  const finalizar = () => {
    abandoned.current = true;
    const faltou = trechos.filter((b) => !b.revelado);
    if (faltou.length) addErros.mutate({ lembrete, trechos: faltou }, { onError: () => toast.error("Não foi possível salvar no Caderno de Erros.") });
    toast.success(faltou.length ? `${faltou.length} trecho(s) enviados ao Caderno de Erros` : "Tudo lembrado! 🎉");
    setStudy((prev) => ({ ...prev, trechos: prev.trechos.map((b) => ({ ...b, revelado: true })) }));
  };

  return (
    <>
      <div className="pb-32">
        <button onClick={onVoltar} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-navy">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Voltar
        </button>
        <div className="mt-6 rounded-2xl bg-navy p-6 text-navy-foreground shadow-sm">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">{lembrete.materia}</span>
          <h1 className="mt-3 text-2xl font-extrabold">{lembrete.titulo}</h1>
          <div className="mt-4 flex items-center gap-3 text-sm">
            <Progress value={trechos.length ? (revelados / trechos.length) * 100 : 0} className="h-2 rounded-full bg-navy-foreground/20" />
            <span className="shrink-0 font-semibold">{revelados}/{trechos.length}</span>
          </div>
        </div>

        <article className="mt-6 rounded-2xl bg-card p-8 text-lg leading-relaxed text-navy shadow-sm md:p-10">
          {trechos.map((t, index) => (
            <Fragment key={t.id}>
            <span
              className={t.revelado ? "rounded-md transition-all duration-700" : "rounded-md bg-muted/50 text-transparent blur-[5px] select-none transition-all duration-700"}
            >
              {t.texto_original.split("\n").map((linha, i) => (
                <Fragment key={i}>{i > 0 && <br />}{linha}</Fragment>
              ))}
            </span>
            {!t.revelado && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Revelar trecho ${index + 1}`}
                title={`Revelar trecho ${index + 1}`}
                onClick={() => setStudy((prev) => revelarComDica(prev, t.id))}
                className="mx-1 inline-flex h-7 w-7 align-middle rounded-2xl text-muted-foreground hover:bg-primary/10 hover:text-primary"
              >
                <Eye className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            )}
            </Fragment>
          ))}
        </article>
        {completion && (
          <section aria-label="Conclusão da revisão" className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-navy">A IA analisou sua fluência!</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex gap-1 text-primary" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-6 w-6 ${i < completion.quality ? "fill-current" : "text-muted-foreground/30"}`} strokeWidth={1.75} />)}</div>
              <p className="font-bold text-navy">{completion.quality}/5 Estrelas</p>
            </div>
            <p className="mt-3 font-semibold text-navy">{["Não lembrado", "Apagão", "Difícil", "Bom", "Muito Bom", "Perfeito"][completion.quality]}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Clock className="h-4 w-4" />Tempo gasto: {Math.ceil(completion.timeTaken)} s</span>
              <span className="flex items-center gap-2"><Eye className="h-4 w-4" />Dicas utilizadas: {completion.hintsUsed}</span>
            </div>
            {save.isPending && <p role="status" className="mt-5 text-muted-foreground">Salvando agendamento...</p>}
            {save.isSuccess && save.data && <p role="status" className="mt-5 flex items-center gap-2 font-semibold text-success"><CalendarDays className="h-5 w-5 shrink-0" />Próxima revisão agendada para daqui a {save.data.interval} dias</p>}
            {save.isError && <div className="mt-5"><p role="alert" className="text-destructive">Não foi possível salvar o agendamento.</p><Button variant="outline" className="mt-3 rounded-2xl" onClick={() => { if (sessionId.current) save.mutate({ sessionId: sessionId.current, lembreteId: lembrete.id, timeTaken: completion.timeTaken, hintsUsed: completion.hintsUsed, abandoned: completion.abandoned }); }}>Tentar novamente</Button></div>}
            <Button variant="outline" onClick={onVoltar} className="mt-5 rounded-2xl"><ArrowLeft />Voltar aos lembretes</Button>
          </section>
        )}
        {revelados < trechos.length && (
          <Button variant="ghost" onClick={finalizar} className="mt-4 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Flag strokeWidth={1.75} /> Desistir e enviar ao Caderno de Erros
          </Button>
        )}
      </div>

      {!completion && <div className="fixed inset-x-0 bottom-0 z-20 pl-20 md:pl-64">
        <div className="mx-auto max-w-4xl px-6 pb-6">
          <div className="flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-sm">
            <Input
              autoFocus
              value={texto}
              onChange={(e) => handle(e.target.value)}
              placeholder="Digite o que você lembra..."
              className="h-12 flex-1 rounded-2xl border-0 shadow-none focus-visible:ring-0"
            />
            <Button size="icon" onClick={mic} className={`h-12 w-12 rounded-2xl ${ouvindo ? "bg-destructive hover:bg-destructive/90" : ""}`} aria-label="Microfone">
              <Mic strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </div>}
    </>
  );
}
