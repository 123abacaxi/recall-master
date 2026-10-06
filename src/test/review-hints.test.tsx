import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ComponentType, ReactNode } from "react";

const { save } = vi.hoisted(() => ({ save: vi.fn() }));

vi.mock("@/components/AppShell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/store", async () => {
  const recall = await import("@/lib/recall");
  return {
    ...recall,
    useAddErros: () => ({ mutate: vi.fn() }),
    useSaveReview: () => ({ mutate: save, isSuccess: true, data: { interval: 1 } }),
    useLembretes: () => ({ isLoading: false, data: [{ id: "note", titulo: "Diabetes", materia: "Medicina", trechos: [
      { id: "1", texto_original: "Metformina. ", keywords: ["metformina"], revelado: false },
      { id: "2", texto_original: "Insulina.", keywords: ["insulina"], revelado: false },
    ] }] }),
  };
});
import { Route } from "@/routes/_authenticated/revisar";
afterEach(() => { cleanup(); save.mockClear(); });
const Review = Route.options.component as ComponentType;

it("removes each eye after its trecho is revealed by click or input", () => {
  render(<Review />);
  fireEvent.click(screen.getByRole("button", { name: /Diabetes/ }));
  fireEvent.click(screen.getByRole("button", { name: "Revelar trecho 1" }));
  expect(screen.queryByRole("button", { name: "Revelar trecho 1" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Revelar trecho 2" })).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Digite o que você lembra..."), { target: { value: "insulina" } });
  expect(screen.queryByRole("button", { name: "Revelar trecho 2" })).not.toBeInTheDocument();
});

it("stops at full reveal and submits telemetry exactly once", async () => {
  render(<Review />);
  fireEvent.click(screen.getByRole("button", { name: /Diabetes/ }));
  fireEvent.click(screen.getByRole("button", { name: "Revelar trecho 1" }));
  fireEvent.change(screen.getByPlaceholderText("Digite o que você lembra..."), { target: { value: "insulina" } });
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ hintsUsed: 1, abandoned: false, timeTaken: expect.any(Number) }));
  expect(screen.queryByPlaceholderText("Digite o que você lembra...")).not.toBeInTheDocument();
});

it("marks surrender as failure instead of awarding a perfect score", async () => {
  render(<Review />);
  fireEvent.click(screen.getByRole("button", { name: /Diabetes/ }));
  fireEvent.click(screen.getByRole("button", { name: "Desistir e enviar ao Caderno de Erros" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ abandoned: true })));
});