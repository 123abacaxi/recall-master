import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const imageInput = z.object({
  dataUrl: z.string().max(11_000_000),
});

const imageDataUrl = /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;

function safeGatewayMessage(status: number, raw: string) {
  try {
    const parsed = JSON.parse(raw) as { message?: unknown; error?: { message?: unknown } };
    const message = parsed.error?.message ?? parsed.message;
    if (typeof message === "string" && message.trim()) return message.trim();
  } catch {
    // The upstream body can be an SSE stream or plain text.
  }
  return status === 402 || status === 403
    ? "A leitura de imagem por IA está indisponível para este projeto."
    : "Não foi possível ler o texto desta imagem.";
}

function parseResponseText(stream: string) {
  let output = "";
  for (const line of stream.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const event = JSON.parse(payload) as { type?: string; delta?: string; response?: { error?: { message?: string } }; error?: { message?: string } };
      if (event.type === "response.output_text.delta" && typeof event.delta === "string") output += event.delta;
      if (event.type === "error" || event.type === "response.failed") {
        throw new Error(event.error?.message ?? event.response?.error?.message ?? "A leitura da imagem falhou.");
      }
    } catch (error) {
      if (error instanceof Error && (error.message === "A leitura da imagem falhou." || error.message.includes("imagem"))) throw error;
    }
  }
  if (!output.trim()) throw new Error("Nenhum texto legível foi encontrado na imagem.");
  const parsed = JSON.parse(output) as { text?: unknown };
  if (typeof parsed.text !== "string" || !parsed.text.trim()) throw new Error("Nenhum texto legível foi encontrado na imagem.");
  return parsed.text.trim();
}

export const extractImageText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => imageInput.parse(data))
  .handler(async ({ data }) => {
    if (!imageDataUrl.test(data.dataUrl)) throw new Error("Selecione uma imagem JPG, PNG, WEBP ou GIF válida.");
    const apiKey = process.env['LOVABLE_API_KEY']!;
    if (!apiKey) throw new Error("A leitura de imagem por IA não está configurada.");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Extraia fielmente todo o texto visível desta imagem médica ou questão. Preserve parágrafos, alternativas e pontuação. Não responda nem corrija o conteúdo." },
            { type: "input_image", image_url: data.dataUrl },
          ],
        }],
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: {
          format: {
            type: "json_schema",
            name: "image_text_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: { text: { type: "string" } },
              required: ["text"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(safeGatewayMessage(response.status, raw));
    return { text: parseResponseText(raw) };
  });