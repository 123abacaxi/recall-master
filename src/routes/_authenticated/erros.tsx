import { createFileRoute } from "@tanstack/react-router";
import { Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useErros, useRemoveErro } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/erros")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Caderno de Erros — OQ lembra" },
      { name: "description", content: "Tudo o que você esqueceu nas revisões, em um só lugar." },
      { property: "og:title", content: "Caderno de Erros — OQ lembra" },
      { property: "og:description", content: "Tudo o que você esqueceu nas revisões." },
    ],
  }),
  component: Erros,
});

function Erros() {
  const { data: erros = [], isLoading } = useErros();
  const remove = useRemoveErro();
  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-navy">Caderno de Erros</h1>
      <p className="mt-1 text-muted-foreground">Tópicos que você não lembrou durante o estudo.</p>
      <ul className="error-list mt-8 space-y-6">
        {isLoading && <p className="text-muted-foreground">Carregando...</p>}
        {!isLoading && erros.length === 0 && <p className="rounded-2xl bg-card p-6 text-muted-foreground shadow-sm">Nenhum erro. Mandou bem!</p>}
        {erros.map((e) => (
          <li key={e.id} className="flex items-start gap-4 rounded-2xl border-l-2 border-l-destructive bg-card p-6">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" strokeWidth={1.75} />
            <div className="flex-1">
              <p className="font-semibold text-navy">{e.texto}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{e.materia}</span>
                <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">{e.lembrete}</span>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => remove.mutate(e.id)} className="rounded-2xl text-success">
              <Check strokeWidth={1.75} /> Aprendi
            </Button>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
