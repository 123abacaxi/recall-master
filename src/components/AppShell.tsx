import { Link } from "@tanstack/react-router";
import { Brain, PenLine, BookX, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { to: "/revisar", label: "Revisar", icon: Brain },
  { to: "/criar", label: "Criar", icon: PenLine },
  { to: "/erros", label: "Caderno de Erros", icon: BookX },
] as const;

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <Brain className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="leading-tight">
        <p className={`text-lg font-extrabold ${light ? "text-navy-foreground" : "text-navy"}`}>OQ MED</p>
        <p className={`text-xs font-medium ${light ? "text-navy-foreground/60" : "text-muted-foreground"}`}>OQ lembra</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-20 flex-col bg-navy p-4 text-navy-foreground md:w-64">
        <div className="hidden md:block"><Logo light /></div>
        <nav className="mt-10 flex flex-1 flex-col gap-2">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-navy-foreground/70 transition-colors hover:bg-navy-foreground/10 hover:text-navy-foreground"
              activeProps={{ className: "!bg-primary !text-primary-foreground shadow-sm" }}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <Link to="/login" onClick={() => { void supabase.auth.signOut(); }} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-navy-foreground/60 hover:bg-navy-foreground/10">
          <LogOut className="h-5 w-5" strokeWidth={1.75} />
          <span className="hidden md:inline">Sair</span>
        </Link>
      </aside>
      <main className="pl-20 md:pl-64">
        <div className="mx-auto max-w-4xl px-6 py-10">{children}</div>
      </main>
    </div>
  );
}
