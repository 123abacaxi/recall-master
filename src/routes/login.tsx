import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — OQ lembra" },
      { name: "description", content: "Acesse o OQ lembra e continue suas revisões." },
      { property: "og:title", content: "Entrar — OQ lembra" },
      { property: "og:description", content: "Acesse o OQ lembra e continue suas revisões." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={(e) => { e.preventDefault(); nav({ to: "/revisar" }); }}
        className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-8 shadow-sm"
      >
        <div className="flex justify-center"><Logo /></div>
        <div className="space-y-3">
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <Input placeholder="Usuário" className="h-12 rounded-2xl pl-11 shadow-sm" />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <Input type="password" placeholder="Senha" className="h-12 rounded-2xl pl-11 shadow-sm" />
          </div>
        </div>
        <Button type="submit" className="h-12 w-full rounded-2xl text-base font-bold shadow-sm">Entrar</Button>
      </form>
    </div>
  );
}
