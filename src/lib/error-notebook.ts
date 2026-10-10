export type ErrorOrigin = "manual" | "audio" | "imagem" | "revisao_legada";

export function createMentorAnalysis(rawText: string) {
  const excerpt = rawText.trim().replace(/\s+/g, " ").slice(0, 160);
  return {
    analysis: `O ponto principal não é decorar uma resposta isolada. Ao revisar “${excerpt}”, identifique primeiro qual conceito a questão está comparando e qual detalhe fez você escolher o caminho errado. Você pode ter aproximado termos parecidos sem testar o critério que realmente os separa. Para evitar isso, transforme a diferença central em uma pergunta curta e tente explicá-la em voz alta antes de consultar o material.`,
    reminderText: `Crie uma Carta Borrada sobre este erro: ${excerpt}. Destaque o conceito confundido, o critério que diferencia as alternativas e uma regra prática para não repetir o erro.`,
  };
}