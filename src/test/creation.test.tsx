import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode, ComponentType } from "react";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/lib/store", () => ({ useAddLembrete: () => ({ mutate }) }));
vi.mock("@/components/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
import { Route } from "@/routes/_authenticated/criar";

vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

afterEach(() => { cleanup(); mutate.mockReset(); });
const Creation = Route.options.component as ComponentType;

describe("draft approval", () => {
  it("only saves on approval, preserving edits and removing an approved draft", async () => {
    render(<Creation />);
    fireEvent.change(screen.getByRole("textbox", { name: "Conteúdo de Matéria" }), { target: { value: "Metformina reduz a glicemia." } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar Nota Inteligente" }));
    await screen.findByRole("button", { name: "Aprovar" });
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Diabetes revisado" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ titulo: "Diabetes revisado" }), expect.any(Object));
    const callbacks = mutate.mock.calls[0]?.[1];
    callbacks.onSuccess();
    callbacks.onSettled();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument());
  });
  it("deletes a draft without publishing it", async () => {
    render(<Creation />);
    fireEvent.change(screen.getByRole("textbox", { name: "Conteúdo de Matéria" }), { target: { value: "Insulina controla a glicemia." } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar Nota Inteligente" }));
    await screen.findByRole("button", { name: "Excluir" });
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});