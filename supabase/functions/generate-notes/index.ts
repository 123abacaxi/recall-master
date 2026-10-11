import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";
import { z } from "https://esm.sh/zod@4.6.5";

const functionName = "generate-notes";
const origin = Deno.env.get("APP_ORIGIN");
const allowedOrigins = new Set([...(origin ? [origin] : []), "http://localhost:3000", "http://localhost:5173"]);
const requestOrigin = (request: Request) => request.headers.get("origin");
const corsHeaders = (request: Request): Record<string, string> => {
  const currentOrigin = requestOrigin(request);
  return {
    "Access-Control-Allow-Origin": currentOrigin && allowedOrigins.has(currentOrigin) ? currentOrigin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

const inputSchema = z.object({
  text: z.string().trim().min(1).max(20_000),
  mode: z.enum(["local", "search"]),
  granularity: z.enum(["auto", "multiple", "single_large"]),
});
const trechoSchema = z.object({
  id: z.string().trim().max(100).optional(),
  texto_original: z.string().trim().min(1).max(4_000),
  keywords: z.array(z.string().trim().min(1).max(100)).max(12),
});
const responseSchema = z.object({ drafts: z.array(z.object({
  id: z.string().trim().max(100).optional(),
  titulo: z.string().trim().min(1).max(200),
  materia: z.string().trim().min(1).max(100),
  trechos: z.array(trechoSchema).min(1).max(100),
})).min(1).max(50) });

type Input = z.infer<typeof inputSchema>;

const modeInstructions = {
  local: "Trate o texto recebido como fonte principal e completa. Organize, fragmente e condense sem adicionar fatos externos desnecessários; preserve a precisão e não invente lacunas.",
  search: "Trate o texto como tema ou direcionamento. Complemente e corrija usando o conhecimento médico do modelo, priorizando diretrizes e literatura atualizadas. Não alegue consulta à internet, não invente referências ou fontes e sinalize incertezas de modo responsável quando relevante.",
} as const;
const granularityInstructions = {
  auto: "Escolha entre agrupar trechos curtos e criar um lembrete único conforme a extensão e a complexidade do conteúdo.",
  multiple: "Produza vários lembretes curtos, cada um com foco bem delimitado e trechos revisáveis.",
  single_large: "Produza exatamente um lembrete coeso e imersivo, com vários trechos ordenados.",
} as const;

export function buildSystemPrompt(mode: Input["mode"], granularity: Input["granularity"]): string {
  return [
    "Você é uma organizadora cuidadosa de lembretes médicos para estudo ativo. A aprovação humana é obrigatória.",
    modeInstructions[mode],
    granularityInstructions[granularity],
    "Responda somente JSON válido, sem markdown, comentários ou texto antes/depois.",
    "O JSON deve ter exatamente a forma {\"drafts\":[{\"titulo\":string,\"materia\":string,\"trechos\":[{\"id\":string,\"texto_original\":string,\"keywords\":[string]}]}]}. Cada trecho precisa ter texto útil e ao menos uma palavra-chave útil. Não inclua referências inventadas, promessas de busca web ou campos fora desse contrato.",
    "Se algum ponto não puder ser confirmado, prefira linguagem responsável de incerteza em vez de apresentar uma suposição como fato.",
  ].join("\n\n");
}

function normalize(value: unknown) {
  const parsed = responseSchema.parse(value);
  return { drafts: parsed.drafts.map((draft, draftIndex) => ({
    id: draft.id?.trim() || `draft-${draftIndex + 1}`,
    titulo: draft.titulo.trim(),
    materia: draft.materia.trim(),
    trechos: draft.trechos.map((trecho, trechoIndex) => ({
      id: trecho.id?.trim() || `t${draftIndex + 1}-${trechoIndex + 1}`,
      texto_original: trecho.texto_original.trim(),
      keywords: [...new Set(trecho.keywords.map((keyword) => keyword.trim()).filter(Boolean))].slice(0, 12).length
        ? [...new Set(trecho.keywords.map((keyword) => keyword.trim()).filter(Boolean))].slice(0, 12)
        : (trecho.texto_original.match(/[\p{L}\p{N}]{4,}/gu) ?? [trecho.texto_original.slice(0, 40)]).slice(0, 3),
      revelado: false,
    })),
  })) };
}

function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), "Content-Type": "application/json" } });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, { error: "Método não permitido." }, 405);
  if (corsHeaders(request)["Access-Control-Allow-Origin"] === "null") return jsonResponse(request, { error: "Origem não autorizada." }, 403);

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResponse(request, { error: "Sessão necessária." }, 401);

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) return jsonResponse(request, { error: "Sessão inválida." }, 401);

    const parsedInput = inputSchema.safeParse(await request.json());
    if (!parsedInput.success) return jsonResponse(request, { error: "Conteúdo ou formato inválido." }, 400);
    const apiKey = Deno.env.get("OQlembra_IA_KEY");
    if (!apiKey) return jsonResponse(request, { error: "A geração de IA está temporariamente indisponível. Tente novamente mais tarde." }, 503);

    const input = parsedInput.data;
    const providerResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": origin ?? "https://oqlembra.app", "X-Title": "OQ lembra" },
      body: JSON.stringify({
        model: "openai/gpt-6-luna",
        messages: [{ role: "system", content: buildSystemPrompt(input.mode, input.granularity) }, { role: "user", content: input.text }],
        response_format: { type: "json_object" },
      }),
    });
    if (!providerResponse.ok) return jsonResponse(request, { error: providerResponse.status === 429 ? "O limite de geração foi atingido. Tente novamente em alguns instantes." : "O provedor de IA está indisponível. Tente novamente mais tarde." }, 502);

    const providerData = await providerResponse.json();
    const content = providerData?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return jsonResponse(request, { error: "A IA retornou uma resposta inválida. Tente novamente." }, 502);
    const unfenced = content.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");
    let output: unknown;
    try { output = JSON.parse(unfenced); } catch { return jsonResponse(request, { error: "A IA retornou uma resposta inválida. Tente novamente." }, 502); }
    try { return jsonResponse(request, normalize(output)); } catch { return jsonResponse(request, { error: "A IA retornou dados incompletos. Tente novamente." }, 502); }
  } catch (error) {
    console.error(`[${functionName}] request failed`, error instanceof Error ? error.message : "unknown error");
    return jsonResponse(request, { error: "Não foi possível gerar os lembretes agora. Tente novamente." }, 500);
  }
});
