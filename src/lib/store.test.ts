import { describe, it, expect } from "vitest";
import { revelarBlocos, type Bloco } from "./store";

const blocos: Bloco[] = [
  { texto: "a", keywords: ["metformina"], dica: "", revelado: false },
  { texto: "b", keywords: ["NYHA"], dica: "", revelado: false },
];

describe("revelarBlocos", () => {
  it("reveals only the block whose keyword is typed", () => {
    const r = revelarBlocos(blocos, "acho que é Metformina");
    expect(r.map((x) => x.revelado)).toEqual([true, false]);
  });
  it("keeps blocks hidden when no keyword matches", () => {
    expect(revelarBlocos(blocos, "insulina").every((x) => !x.revelado)).toBe(true);
  });
});
