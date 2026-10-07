import { Link } from "@tanstack/react-router";
import { Brain, PenLine, BookX, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const items = [
  { to: "/revisar", label: "Revisar", icon: Brain },
  { to: "/criar", label: "Criar", icon: PenLine },
  { to: "/erros", label: "Caderno de Erros", icon: BookX },
] as const;

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-2xl bg-navy text-navy-foreground">
        <Brain className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="leading-tight">
        <p className={`font-display text-lg font-bold ${light ? "text-navy-foreground" : "text-navy"}`}>OQ MED</p>
        <p className={`text-xs font-medium ${light ? "text-navy-foreground/60" : "text-muted-foreground"}`}>OQ lembra</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={120}>
    <div className="station-page">
    <div className="station-shell">
      <aside className="station-sidebar">
        <Link to="/revisar" aria-label="OQ MED — Revisar" className="brand-mark flex h-10 w-10 items-center justify-center rounded-2xl bg-navy font-display text-xs font-bold text-navy-foreground">OQ</Link>
        <nav aria-label="Menu principal" className="mt-12 flex flex-1 flex-col gap-6">
          {items.map(({ to, label, icon: Icon }) => (
            <Tooltip key={to}>
            <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon" className="rail-button">
            <Link
              to={to}
              aria-label={label}
              activeProps={{ className: "rail-active" }}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            </Link>
            </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <Tooltip><TooltipTrigger asChild>
        <Button asChild variant="ghost" size="icon" className="rail-button text-destructive">
        <Link to="/login" aria-label="Sair" onClick={() => { void supabase.auth.signOut(); }}>
          <LogOut className="h-5 w-5" strokeWidth={1.75} />
        </Link>
        </Button></TooltipTrigger><TooltipContent side="right">Sair</TooltipContent></Tooltip>
      </aside>
      <main className="station-main">
        <div className="station-brand"><span className="font-display font-bold text-navy">OQ MED</span><span className="text-muted-foreground">OQ lembra</span></div>
        <div className="station-content">{children}</div>
      </main>
    </div>
    </div>
    </TooltipProvider>
  );
}
