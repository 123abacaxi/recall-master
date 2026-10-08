import { describe, expect, it } from "vitest";
import { createMentorAnalysis } from "./error-notebook";

describe("error notebook mentor", () => {
  it("focuses on the learner's confusion and prepares a reminder prompt", () => {
    const result = createMentorAnalysis("Confundi critérios maiores com critérios menores.");
    expect(result.analysis).toContain("critério");
    expect(result.analysis).toContain("caminho errado");
    expect(result.reminderText).toContain("Carta Borrada");
  });
});