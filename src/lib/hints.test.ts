import { describe, expect, it } from "vitest";
import { revelarComDica, revelarTrechos, type RecallState } from "./recall";

const initial: RecallState = {
  hintsUsed: 0,
  trechos: [
    { id: "1", texto_original: "Metformina. ", keywords: ["metformina"], revelado: false },
    { id: "2", texto_original: "Insulina.", keywords: ["insulina"], revelado: false },
  ],
};

describe("eye hints", () => {
  it("reveals only the clicked trecho and increments hintsUsed by one", () => {
    const next = revelarComDica(initial, "2");
    expect(next.hintsUsed).toBe(1);
    expect(next.trechos.map((t) => t.revelado)).toEqual([false, true]);
  });
  it("does not count a repeated click on an already revealed trecho", () => {
    const next = revelarComDica(initial, "1");
    expect(revelarComDica(next, "1").hintsUsed).toBe(1);
  });
  it("does not count text or voice matches as hints", () => {
    const matched = { ...initial, trechos: revelarTrechos(initial.trechos, "metformina") };
    expect(matched.hintsUsed).toBe(0);
    expect(revelarComDica(matched, "1").hintsUsed).toBe(0);
  });
});