import { describe, expect, it } from "vitest";
import { buildErrorExplanationSystemPrompt, errorExplanationResponseSchema } from "./error-notebook";

describe("error notebook mentor", () => {
  it("defines the required clinical explanation structure", () => {
    const prompt = buildErrorExplanationSystemPrompt();
    expect(prompt).toContain("A Realidade Clínica (Diretriz)");
    expect(prompt).toContain("Regra de Bolso (Para não errar mais)");
    expect(prompt).toContain("falha de raciocínio clínico");
  });

  it("validates a markdown explanation returned by the API", () => {
    const result = errorExplanationResponseSchema.parse({
      analysis: "Confusão conceitual.\n\n## A Realidade Clínica (Diretriz)\n- **Critério** correto.\n\n## Regra de Bolso (Para não errar mais)\nLembre do critério.",
    });
    expect(result.analysis).toContain("Critério");
  });
});
