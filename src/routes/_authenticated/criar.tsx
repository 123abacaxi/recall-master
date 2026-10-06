import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Check, Pencil, Trash2, X, Save, Globe, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { useAddLembrete } from "@/lib/store";
import { generateMockNotes, isDraftReady, type Draft, type GenerationPayload } from "@/lib/generation";

export const Route = createFileRoute("/_authenticated/criar")({
  head: () => ({ meta: [
    { title: "Criar lembretes — OQ lembra" },
    { name: "description", content: "Prepare, edite e aprove lembretes de medicina antes de revisar." },
    { property: "og:title", content: "Criar lembretes — OQ lembra" },
    { property: "og:description", content: "Prepare, edite e aprove lembretes de medicina antes de revisar." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Criar,
});

function Criar() {
  const add = useAddLembrete();
  const [texto, setTexto] = useState("");
  const [mode, setMode] = useState<GenerationPayload["mode"]>("local");
  const [granularity, setGranularity] = useState<GenerationPayload["granularity"]>("auto");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  const gerar = async () => {
    if (!texto.trim() || loading) return;
    setLoading(true);
    const payload: GenerationPayload = { text: texto, mode, granularity };
    try {
      const generated = await generateMockNotes(payload);
      setDrafts((prev) => [...prev, ...generated.map((draft) => ({ ...draft, id: crypto.randomUUID() }))]);
      toast.success("Rascunhos prontos para aprovação.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar.");
    } finally { setLoading(false); }
  };

  const approve = (draft: Draft) => {
    if (approving || !isDraftReady(draft)) return;
    setApproving(draft.id);
    add.mutate({ titulo: draft.titulo, materia: draft.materia, trechos: draft.trechos }, {
      onSuccess: () => {
        setDrafts((prev) => prev.filter((item) => item.id !== draft.id));
        toast.success("Lembrete aprovado e disponível em Revisar!");
      },
      onError: () => toast.error("Não foi possível aprovar. Seu rascunho foi mantido."),
      onSettled: () => setApproving(null),
    });
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-navy">Criar</h1>
      <form className="mt-6" onSubmit={(event) => { event.preventDefault(); void gerar(); }}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`flex items-center gap-2 text-sm font-semibold ${mode === "local" ? "text-primary" : "text-muted-foreground"}`}><BookOpen className="h-4 w-4" />Conteúdo de Matéria</span>
          <Switch aria-label="Pesquisa Externa" checked={mode === "search"} onCheckedChange={(checked) => setMode(checked ? "search" : "local")} disabled={loading} className="data-[state=checked]:bg-search-accent" />
          <span className={`flex items-center gap-2 text-sm font-semibold ${mode === "search" ? "text-search-accent" : "text-muted-foreground"}`}><Globe className="h-4 w-4" />Pesquisa Externa</span>
        </div>
        <Textarea
          aria-label={mode === "local" ? "Conteúdo de Matéria" : "Tema da pesquisa"}
          value={texto} onChange={(event) => setTexto(event.target.value)} disabled={loading}
          placeholder={mode === "local" ? "Cole seu resumo ou texto aqui para a IA fragmentar..." : "Digite o que a IA deve pesquisar e estruturar (ex: Critérios de Duke para Endocardite)..."}
          className={`mt-5 min-h-64 rounded-2xl border p-6 text-base shadow-sm transition-colors ${mode === "local" ? "bg-local-surface border-local-border" : "bg-search-surface border-search-border"}`}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0 space-y-2">
            <label htmlFor="generation-format" className="text-sm font-bold text-navy">Formato de Geração</label>
            <Select value={granularity} onValueChange={(value) => { if (value === "auto" || value === "multiple" || value === "single_large") setGranularity(value); }} disabled={loading}>
              <SelectTrigger id="generation-format" className="h-12 rounded-2xl bg-card"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="auto" className="rounded-2xl">Automático</SelectItem>
                <SelectItem value="multiple" className="rounded-2xl">Múltiplos Lembretes (Curtos)</SelectItem>
                <SelectItem value="single_large" className="rounded-2xl">1 Lembrete Longo (Imersivo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading || !texto.trim()} className="h-12 rounded-2xl px-5 font-bold shadow-sm"><Sparkles strokeWidth={1.75} className={loading ? "motion-safe:animate-pulse" : ""} />{loading ? "Gerando..." : "Gerar Nota Inteligente"}</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground" role="status">Geração simulada · sem IA ou pesquisa web conectada.</p>
      </form>
      {drafts.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-navy">Aguardando aprovação</h2><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{drafts.length}</span></div>
          <div className="space-y-4">
            {drafts.map((draft) => <DraftCard key={draft.id} draft={draft} busy={approving !== null} approving={approving === draft.id} onApprove={() => approve(draft)} onDelete={() => setDrafts((prev) => prev.filter((item) => item.id !== draft.id))} onUpdate={(updated) => setDrafts((prev) => prev.map((item) => item.id === updated.id ? updated : item))} />)}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function DraftCard({ draft, busy, approving, onApprove, onDelete, onUpdate }: { draft: Draft; busy: boolean; approving: boolean; onApprove: () => void; onDelete: () => void; onUpdate: (draft: Draft) => void }) {
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(draft);
  const updateTrecho = (id: string, patch: Partial<Draft["trechos"][number]>) => setEdited((prev) => ({ ...prev, trechos: prev.trechos.map((t) => t.id === id ? { ...t, ...patch } : t) }));
  return (
    <article className="min-w-0 rounded-2xl bg-card p-6 shadow-sm">
      {editing ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor={`title-${draft.id}`} className="text-xs font-semibold text-muted-foreground">Título</label><Input id={`title-${draft.id}`} value={edited.titulo} maxLength={200} onChange={(e) => setEdited({ ...edited, titulo: e.target.value })} className="mt-1 h-11 rounded-2xl" /></div>
            <div><label htmlFor={`subject-${draft.id}`} className="text-xs font-semibold text-muted-foreground">Matéria</label><Input id={`subject-${draft.id}`} value={edited.materia} maxLength={100} onChange={(e) => setEdited({ ...edited, materia: e.target.value })} className="mt-1 h-11 rounded-2xl" /></div>
          </div>
          {edited.trechos.map((t, i) => <div key={t.id} className="space-y-2">
            <label htmlFor={`text-${draft.id}-${t.id}`} className="text-xs font-semibold text-muted-foreground">Trecho {i + 1}</label>
            <Textarea id={`text-${draft.id}-${t.id}`} value={t.texto_original} onChange={(e) => updateTrecho(t.id, { texto_original: e.target.value })} className="min-h-24 rounded-2xl" />
            <label htmlFor={`keywords-${draft.id}-${t.id}`} className="text-xs font-semibold text-muted-foreground">Palavras-chave (separadas por vírgula)</label>
            <Input id={`keywords-${draft.id}-${t.id}`} value={t.keywords.join(",")} onChange={(e) => updateTrecho(t.id, { keywords: e.target.value.split(",") })} className="rounded-2xl" />
          </div>)}
          <div className="flex flex-wrap gap-2">
            <Button disabled={!isDraftReady(edited)} onClick={() => { onUpdate({ ...edited, trechos: edited.trechos.map((t) => ({ ...t, keywords: t.keywords.map((k) => k.trim()).filter(Boolean) })) }); setEditing(false); }} className="rounded-2xl"><Save />Salvar alterações</Button>
            <Button variant="ghost" className="rounded-2xl" onClick={() => { setEdited(draft); setEditing(false); }}><X />Cancelar</Button>
          </div>
        </div>
      ) : (
        <>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{draft.materia}</span>
          <h3 className="mt-3 break-words text-lg font-bold text-navy">{draft.titulo}</h3>
          <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed text-navy">{draft.trechos.map((t) => t.texto_original).join("")}</p>
          <div className="mt-4 flex flex-wrap gap-2">{[...new Set(draft.trechos.flatMap((t) => t.keywords))].map((k) => <span key={k} className="max-w-full break-words rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{k}</span>)}</div>
          <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
            <Button disabled={busy || !isDraftReady(draft)} onClick={onApprove} className="rounded-2xl bg-success text-success-foreground hover:bg-success/90"><Check />{approving ? "Aprovando..." : "Aprovar"}</Button>
            <Button variant="outline" disabled={busy} onClick={() => { setEdited(draft); setEditing(true); }} className="rounded-2xl"><Pencil />Editar</Button>
            <Button variant="ghost" disabled={busy} onClick={onDelete} className="rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 />Excluir</Button>
          </div>
        </>
      )}
    </article>
  );
}
