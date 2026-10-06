import { describe, expect, it } from "vitest";
import { createMockDrafts, isDraftReady, type GenerationPayload } from "./generation";

const payload: GenerationPayload = { text: "Metformina reduz glicemia. Insulina controla glicemia. Exercícios ajudam o controle. Alimentação adequada é importante. Monitorização permite ajustes.", mode: "local", granularity: "auto" };

describe("generation rules", () => {
  it("keeps the submission text, mode and granularity", () => {
    expect(Object.keys(payload).sort()).toEqual(["granularity", "mode", "text"]);
    const search = { ...payload, text: "Critérios de Duke", mode: "search" as const, granularity: "single_large" as const };
    expect(createMockDrafts(search)[0]?.trechos[0]?.texto_original).toContain("Critérios de Duke");
    expect(search).toEqual({ text: "Critérios de Duke", mode: "search", granularity: "single_large" });
  });
  it("generates multiple short notes with one or two trechos", () => {
    const drafts = createMockDrafts({ ...payload, granularity: "multiple" });
    expect(drafts.map((d) => d.trechos.length)).toEqual([2, 2, 1]);
  });
  it("groups all trechos in one immersive note", () => {
    const drafts = createMockDrafts({ ...payload, granularity: "single_large" });
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.trechos).toHaveLength(5);
  });
  it("preserves the local content across generated notes", () => {
    expect(createMockDrafts(payload).flatMap((d) => d.trechos.map((t) => t.texto_original)).join("")).toBe(payload.text);
  });
  it("does not generate notes for blank input", () => {
    expect(() => createMockDrafts({ ...payload, text: "  " })).toThrow();
  });
  it("requires valid content and keywords before approval", () => {
    const draft = createMockDrafts(payload)[0];
    if (!draft) throw new Error("Missing draft");
    expect(isDraftReady(draft)).toBe(true);
    expect(isDraftReady({ ...draft, trechos: [{ ...draft.trechos[0], id: "1", texto_original: "Teste", revelado: false, keywords: [] }] })).toBe(false);
  });
});