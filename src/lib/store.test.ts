import { describe, it, expect } from "vitest";
import { revelarTrechos, sanitizeText, matchKeyword, type Trecho } from "./recall";

const trechos: Trecho[] = [
  { id: "1", texto_original: "A primeira escolha é a metformina, ", keywords: ["metformina"], revelado: false },
  { id: "2", texto_original: "classificada pela NYHA.", keywords: ["NYHA"], revelado: false },
];

describe("recall matching", () => {
  it("sanitizeText lowercases, strips accents and punctuation", () => {
    expect(sanitizeText("Coronária, Glicada.")).toBe("coronaria glicada");
  });
  it("reveals only the trecho whose keyword is typed", () => {
    expect(revelarTrechos(trechos, "acho que é Metformina!").map((x) => x.revelado)).toEqual([true, false]);
  });
  it("keeps trechos hidden when no keyword matches", () => {
    expect(revelarTrechos(trechos, "insulina").every((x) => !x.revelado)).toBe(true);
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
