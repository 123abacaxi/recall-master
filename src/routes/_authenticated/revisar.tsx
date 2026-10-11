import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Mic, Flag, Eye, Star, Clock, CalendarDays, Layers, CheckCircle2, SkipForward, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/AppShell";
import { useLembretes, useSaveReview, revelarTrechos, type Lembrete } from "@/lib/store";
import { revelarComDica } from "@/lib/recall";
import { calculateQualityScore, buildDailyQueue, isDue, advanceQueue } from "@/lib/srs";

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
  const [fila, setFila] = useState<string[] | null>(null);
  const [deckOrder, setDeckOrder] = useState<string[]>([]);
  const [rodada, setRodada] = useState(0);

  const vencidos = buildDailyQueue(lembretes);
  const vencidosIds = vencidos.map((l) => l.id).join(",");
  useEffect(() => {
    setDeckOrder(vencidosIds ? vencidosIds.split(",") : []);
  }, [vencidosIds]);
  const byId = new Map(lembretes.map((l) => [l.id, l]));
  const deck = deckOrder.map((id) => byId.get(id)).filter(Boolean) as Lembrete[];
  const emDia = lembretes.filter((l) => !isDue(l.nextReviewAt));

  const iniciarFila = () => {
    if (!deck.length) return;
    const ids = deck.map((l) => l.id);
    setFila(ids);
    setRodada((r) => r + 1);
    setAtivo(byId.get(ids[0]!) ?? null);
  };
  const proximo = (quality: number) => {
    const rest = advanceQueue(fila ?? [], quality);
    setFila(rest.length ? rest : null);
    setRodada((r) => r + 1);
    setAtivo(rest[0] ? byId.get(rest[0]) ?? null : null);
    if (!rest.length) toast.success("Fila do dia concluída!");
  };
  const sair = () => { setAtivo(null); setFila(null); };

  return (
    <AppShell>
      {ativo ? (
        <ModoEstudo
          key={`${ativo.id}-${rodada}`}
          lembrete={ativo}
          onVoltar={sair}
          fila={fila ? { restantes: fila.length, onProximo: proximo } : undefined}
        />
      ) : (
        <>
          <h1 className="text-3xl font-extrabold text-navy">Revisar</h1>
          <p className="mt-1 text-muted-foreground">Sua repetição espaçada decide o que voltar a ver hoje.</p>
          {isLoading && <p className="mt-8 text-muted-foreground">Carregando...</p>}

          <section aria-label="Revisões do dia" className="mt-8 rounded-2xl border border-primary/20 bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-navy">
                  <Layers className="h-5 w-5 text-primary" strokeWidth={1.75} />
                  {deck.length === 1 ? "Revisão do dia" : "Revisões do dia"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {deck.length ? `${deck.length} ${deck.length === 1 ? "lembrete vencido" : "lembretes vencidos"} na fila` : "Nada vencido. Volte amanhã!"}
                </p>
              </div>
              {deck.length > 0 && (
                <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">{deck.length} para hoje</span>
              )}
            </div>

            {deck.length === 0 && !isLoading && (
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-success/10 p-4 text-success">
                <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} /> <span className="font-semibold">Tudo em dia.</span>
              </div>
            )}

            {deck.length === 1 && deck[0] && (
              <Button variant="ghost" onClick={iniciarFila} className="reminder-tile mt-6 h-auto w-full flex-col items-start rounded-2xl bg-card p-6 text-left">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{deck[0].materia}</span>
                <span className="mt-3 text-lg font-bold text-navy">{deck[0].titulo}</span>
                <span className="mt-2 text-xs text-destructive">{venceuTexto(deck[0])}</span>
              </Button>
            )}

            {deck.length > 1 && (
              <div className="mt-6 flex flex-col items-center gap-6">
                <div className="relative h-56 w-full max-w-md">
                  {deck.slice(0, 4).reverse().map((l, ri, arr) => {
                    const depth = arr.length - 1 - ri;
                    const top = depth === 0;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={top ? iniciarFila : undefined}
                        tabIndex={top ? 0 : -1}
                        aria-hidden={!top}
                        className={`absolute inset-0 flex flex-col items-start rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all duration-500 ${top ? "cursor-pointer hover:-translate-y-1 hover:shadow-md" : "pointer-events-none"}`}
                        style={{ transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.05}) rotate(${depth % 2 ? -1.5 * depth : 1.5 * depth}deg)`, opacity: 1 - depth * 0.18, zIndex: 10 - depth }}
                      >
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{l.materia}</span>
                        <span className="mt-4 text-xl font-bold text-navy">{l.titulo}</span>
                        <span className="mt-2 text-sm text-muted-foreground">{l.trechos.length} trechos</span>
                        <span className="mt-auto text-xs font-semibold text-destructive">{venceuTexto(l)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="outline" className="rounded-2xl" onClick={() => setDeckOrder((d) => (d.length ? [...d.slice(1), d[0]!] : d))}>
                    <SkipForward strokeWidth={1.75} /> Pular carta
                  </Button>
                  <Button className="rounded-2xl" onClick={iniciarFila}>
                    <Play strokeWidth={1.75} /> Começar fila ({deck.length})
                  </Button>
                </div>
              </div>
            )}
          </section>

          {emDia.length > 0 && (
            <>
              <h2 className="mt-10 text-lg font-bold text-navy">Em dia</h2>
              <div className="reminder-grid mt-4 grid gap-6 sm:grid-cols-2">
                {emDia.map((l) => (
                  <Button variant="ghost" key={l.id} onClick={() => setAtivo(l)} className="reminder-tile group rounded-2xl bg-card p-6 text-left transition-all">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{l.materia}</span>
                    <h3 className="mt-4 text-lg font-bold text-navy">{l.titulo}</h3>
                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                      <span>{l.trechos.length} trechos</span>
                      <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={1.75} />
                    </div>
                    {l.nextReviewAt && <p className="mt-3 text-xs text-primary">Próxima revisão: {new Date(l.nextReviewAt).toLocaleDateString("pt-BR")}</p>}
                  </Button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}

function venceuTexto(l: Lembrete) {
  if (!l.nextReviewAt) return "Nunca revisado";
  const dias = Math.floor((Date.now() - new Date(l.nextReviewAt).getTime()) / 86400000);
  return dias <= 0 ? "Vence hoje" : `Atrasado ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

function ModoEstudo({ lembrete, onVoltar, fila }: { lembrete: Lembrete; onVoltar: () => void; fila?: { restantes: number; onProximo: (quality: number) => void } | undefined }) {
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
    toast.success("Revisão encerrada. Seu Caderno de Erros permanece separado.");
    setStudy((prev) => ({ ...prev, trechos: prev.trechos.map((b) => ({ ...b, revelado: true })) }));
  };

  return (
    <>
      <div className="study-layout">
        <Button variant="ghost" onClick={onVoltar} className="w-fit px-0 text-sm font-semibold text-muted-foreground hover:bg-transparent hover:text-navy">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Voltar
        </Button>
        <header className="study-header">
          <div className="min-w-0">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-navy">{lembrete.materia}</span>
          <h1 className="mt-3 text-3xl font-bold text-navy">{lembrete.titulo}</h1>
          </div>
          <div className="study-progress">
            <Progress aria-label="Progresso da revisão" value={trechos.length ? (revelados / trechos.length) * 100 : 0} className="rounded-full" />
            <p className="mt-2 text-right text-xs font-semibold text-muted-foreground">{revelados}/{trechos.length}</p>
          </div>
        </header>

        <article className="study-note bg-card text-navy">
          {trechos.map((t, index) => (
            <Fragment key={t.id}>
            <span
              className={t.revelado ? "recall-revealed rounded-2xl transition-all duration-700" : "rounded-2xl bg-muted/50 text-transparent blur-[5px] select-none transition-all duration-700"}
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
                className="hint-eye mx-1 inline-flex h-7 w-7 align-middle rounded-2xl hover:text-navy"
              >
                <Eye className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            )}
            </Fragment>
          ))}
        </article>
        {completion && (
          <section aria-label="Conclusão da revisão" className="completion-panel mt-6 rounded-2xl bg-card p-6">
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
            {save.isSuccess && save.data && <p role="status" className="mt-5 flex items-center gap-2 font-semibold text-success"><CalendarDays className="h-5 w-5 shrink-0" />Próxima revisão agendada para daqui a {save.data.interval} {save.data.interval === 1 ? "dia" : "dias"} ({save.data.repetitions} {save.data.repetitions === 1 ? "repetição" : "repetições"}, facilidade {Number(save.data.ease_factor ?? 2.5).toFixed(2)})</p>}
            {save.isError && <div className="mt-5"><p role="alert" className="text-destructive">Não foi possível salvar o agendamento.</p><Button variant="outline" className="mt-3 rounded-2xl" onClick={() => { if (sessionId.current) save.mutate({ sessionId: sessionId.current, lembreteId: lembrete.id, timeTaken: completion.timeTaken, hintsUsed: completion.hintsUsed, abandoned: completion.abandoned }); }}>Tentar novamente</Button></div>}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="outline" onClick={onVoltar} className="rounded-2xl"><ArrowLeft />{fila ? "Sair da fila" : "Voltar aos lembretes"}</Button>
              {fila && (
                <Button disabled={save.isPending} onClick={() => fila.onProximo(save.data?.quality_score ?? completion.quality)} className="rounded-2xl">
                  {completion.quality < 3 ? "Voltará ao fim da fila · " : ""}
                  {fila.restantes - (completion.quality < 3 ? 0 : 1) > 0 ? `Próximo (${fila.restantes - (completion.quality < 3 ? 0 : 1)} restantes)` : "Concluir fila"}
                  <ChevronRight />
                </Button>
              )}
            </div>
          </section>
        )}
        {revelados < trechos.length && (
          <Button variant="ghost" onClick={finalizar} className="mt-4 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Flag strokeWidth={1.75} /> Encerrar revisão
          </Button>
        )}
      {!completion && <footer className="recall-dock">
            <Input
              autoFocus
              value={texto}
              onChange={(e) => handle(e.target.value)}
              placeholder="Digite o que você lembra..."
               aria-label="Digite o que você lembra"
               className="flex-1 border border-input focus-visible:ring-1"
            />
            <Button variant="ghost" size="icon" onClick={mic} className={`recall-mic ${ouvindo ? "is-listening" : ""}`} aria-label="Microfone" title={ouvindo ? "Parar microfone" : "Usar microfone"} aria-pressed={ouvindo}>
              <Mic strokeWidth={1.75} />
            </Button>
            <Button variant="navy" className="recall-confirm" onClick={() => handle(texto)}>Confirmar</Button>
      </footer>}
      </div>
    </>
  );
}
