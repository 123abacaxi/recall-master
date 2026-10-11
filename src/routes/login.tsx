import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Mail, ArrowUpRight, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Entrar — OQ lembra" },
      { name: "description", content: "Acesse o OQ lembra e continue suas revisões." },
      { property: "og:title", content: "Entrar — OQ lembra" },
      { property: "og:description", content: "Acesse o OQ lembra e continue suas revisões." },
      { property: "og:image", content: "/logo-oq-med.png" },
      { name: "twitter:image", content: "/logo-oq-med.png" },
    ],
  }),
  component: Login,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(6, "A senha precisa de pelo menos 6 caracteres").max(72),
});

function Login() {
  const nav = useNavigate();
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse({ email, senha });
    if (!p.success) { toast.error(p.error.issues[0]?.message); return; }
    setLoading(true);
    const { data, error } =
      modo === "entrar"
        ? await supabase.auth.signInWithPassword({ email: p.data.email, password: p.data.senha })
        : await supabase.auth.signUp({ email: p.data.email, password: p.data.senha, options: { emailRedirectTo: `${window.location.origin}/revisar` } });
    setLoading(false);
    if (error) { toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message); return; }
    if (!data.session) { toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail."); return; }
    nav({ to: "/revisar" });
  };

  return (
    <div className="login-page">
      <form onSubmit={submit} className="login-panel w-full max-w-md space-y-8 rounded-2xl p-8 sm:p-12">
        <Logo />
        <div className="space-y-2"><p className="text-xs font-bold uppercase text-primary">Seu espaço de estudo</p><h1 className="text-3xl font-bold text-navy">{modo === "entrar" ? "Bom ter você aqui." : "Sua próxima conquista."}</h1></div>
        <div className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <Input aria-label="E-mail" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="h-14 rounded-2xl pl-11" />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <Input aria-label="Senha" autoComplete={modo === "entrar" ? "current-password" : "new-password"} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha" className="h-14 rounded-2xl pl-11" />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="h-14 w-full rounded-2xl text-base font-bold">
          {loading ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
          {loading ? <LoaderCircle className="motion-safe:animate-spin" /> : <ArrowUpRight />}
        </Button>
        <Button variant="ghost" type="button" onClick={() => setModo(modo === "entrar" ? "cadastrar" : "entrar")} className="w-full text-sm font-semibold text-muted-foreground">
          {modo === "entrar" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </Button>
      </form>
    </div>
  );
}
