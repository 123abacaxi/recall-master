import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Save, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/AppShell";
import { addLembrete, type Bloco } from "@/lib/store";

export const Route = createFileRoute("/criar")({
  head: () => ({
    meta: [
      { title: "Criar nota — OQ lembra" },
      { name: "description", content: "Cole seu conteúdo e gere tópicos de revisão com IA." },
      { property: "og:title", content: "Criar nota — OQ lembra" },
      { property: "og:description", content: "Gere tópicos de revisão a partir do seu conteúdo." },
    ],
  }),
  component: Criar,
});

const mockGerado: Bloco[] = [
  { texto: "HAS: PA ≥ 140/90 mmHg em duas medidas", keywords: ["140"], dica: "Quatorze por nove", revelado: false },
  { texto: "Primeira linha: tiazídicos, IECA/BRA ou BCC", keywords: ["tiazídico", "tiazidico"], dica: "Diurético", revelado: false },
  { texto: "Meta pressórica geral: < 130/80 mmHg", keywords: ["130"], dica: "Treze por oito", revelado: false },
];

function Criar() {
  const nav = useNavigate();
  const [texto, setTexto] = useState("");
  const [titulo, setTitulo] = useState("Hipertensão Arterial");
  const [materia, setMateria] = useState("Cardiologia");
  const [preview, setPreview] = useState<Bloco[] | null>(null);
  const [loading, setLoading] = useState(false);

  const gerar = () => {
    setLoading(true);
    setTimeout(() => { setPreview(mockGerado); setLoading(false); }, 900);
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-navy">Criar</h1>
      <p className="mt-1 text-muted-foreground">Cole seu resumo e a IA transforma em tópicos para lembrar.</p>

      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Cole aqui sua aula, resumo ou anotação..."
        className="mt-6 min-h-64 rounded-2xl border-0 bg-card p-6 text-base shadow-sm"
      />
      <Button onClick={gerar} disabled={loading} className="mt-4 h-12 rounded-2xl px-6 font-bold shadow-sm">
        <Sparkles strokeWidth={1.75} /> {loading ? "Gerando..." : "Gerar Nota (IA)"}
      </Button>

      {preview && (
        <section className="mt-10 rounded-2xl bg-card p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-11 rounded-2xl font-bold" />
            <Input value={materia} onChange={(e) => setMateria(e.target.value)} className="h-11 rounded-2xl" />
          </div>
          <ul className="mt-6 space-y-3">
            {preview.map((b) => (
              <li key={b.texto} className="rounded-2xl border bg-background p-4">
                <p className="font-semibold text-navy">• {b.texto}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {b.keywords.map((k) => (
                    <span key={k} className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{k}</span>
                  ))}
                  <span className="flex items-center gap-1 text-muted-foreground"><Lightbulb className="h-3 w-3" /> {b.dica}</span>
                </div>
              </li>
            ))}
          </ul>
          <Button
            onClick={() => { addLembrete({ titulo, materia, blocos: preview }); toast.success("Nota salva!"); nav({ to: "/revisar" }); }}
            className="mt-6 h-12 rounded-2xl bg-success px-6 font-bold text-success-foreground shadow-sm hover:bg-success/90"
          >
            <Save strokeWidth={1.75} /> Salvar lembrete
          </Button>
        </section>
      )}
    </AppShell>
  );
}
