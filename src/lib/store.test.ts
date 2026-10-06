import { describe, it, expect } from "vitest";
import { revelarBlocos, sanitizeText, matchKeyword, type Bloco } from "./recall";

const blocos: Bloco[] = [
  { texto: "a", keywords: ["metformina"], dica: "", revelado: false },
  { texto: "b", keywords: ["NYHA"], dica: "", revelado: false },
];

describe("recall matching", () => {
  it("sanitizeText lowercases, strips accents and punctuation", () => {
    expect(sanitizeText("Coronária, Glicada.")).toBe("coronaria glicada");
  });
  it("reveals only the block whose keyword is typed", () => {
    expect(revelarBlocos(blocos, "acho que é Metformina!").map((x) => x.revelado)).toEqual([true, false]);
  });
  it("keeps blocks hidden when no keyword matches", () => {
    expect(revelarBlocos(blocos, "insulina").every((x) => !x.revelado)).toBe(true);
  });
  it("matches accent/punctuation differences", () => {
    expect(matchKeyword("doenca coronaria", "coronária")).toBe(true);
    expect(matchKeyword("hba1c de 6.5", "6,5")).toBe(true);
  });
  it("matches multi-word keywords out of order, ignoring connectives", () => {
    expect(matchKeyword("a glicada, né, da hemoglobina", "hemoglobina glicada")).toBe(true);
    expect(matchKeyword("hemoglobina", "hemoglobina glicada")).toBe(false);
  });
});
