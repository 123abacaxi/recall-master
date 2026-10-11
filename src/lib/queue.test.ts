import { describe, expect, it } from "vitest";
import { advanceQueue, buildDailyQueue, isDue } from "./srs";

const now = new Date("2026-10-11T12:00:00Z");
describe("fila do dia", () => {
  it("vencido ou nunca revisado entra; futuro não", () => {
    expect(isDue(null, now)).toBe(true);
    expect(isDue("2026-10-10T12:00:00Z", now)).toBe(true);
    expect(isDue("2026-10-12T12:00:00Z", now)).toBe(false);
  });
  it("ordena vencidos mais antigos primeiro, depois novos", () => {
    const q = buildDailyQueue([
      { id: "novo" }, { id: "ontem", nextReviewAt: "2026-10-10T00:00:00Z" },
      { id: "futuro", nextReviewAt: "2026-10-20T00:00:00Z" }, { id: "semana", nextReviewAt: "2026-10-04T00:00:00Z" },
    ], now);
    expect(q.map((i) => i.id)).toEqual(["semana", "ontem", "novo"]);
  });
  it("erro (nota < 3) volta para o fim da fila; acerto sai", () => {
    expect(advanceQueue(["a", "b"], 2)).toEqual(["b", "a"]);
    expect(advanceQueue(["a", "b"], 4)).toEqual(["b"]);
  });
});
