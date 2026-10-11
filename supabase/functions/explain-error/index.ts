import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";
import { z } from "https://esm.sh/zod@4.6.5";

const functionName = "explain-error";
const configuredOrigin = Deno.env.get("APP_ORIGIN");
const allowedOrigins = new Set([...(configuredOrigin ? [configuredOrigin] : []), "http://localhost:3000", "http://localhost:5173"]);

const corsHeaders = (request: Request): Record<string, string> => {
  const requestOrigin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": requestOrigin && allowedOrigins.has(requestOrigin) ? requestOrigin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
};

const inputSchema = z.object({ text: z.string().trim().min(1).max(20_000) });
const responseSchema = z.object({ analysis: z.string().trim().min(1).max(20_000) });

function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

function buildSystemPrompt() {
  return [
    "Você é um preceptor sênior de clínica médica e cirurgia, especialista em preparar alunos para as provas de residência mais difíceis do Brasil.",
    "O usuário enviará um fragmento de erro: OCR de questão, transcrição de áudio confusa ou anotação manual. Ignore erros de digitação, formatação quebrada e vícios de linguagem. Vá direto ao cerne médico.",
    "Seu objetivo é corrigir a falha de raciocínio clínico, não apenas informar o gabarito. Baseie-se estritamente nas diretrizes médicas mais atualizadas. Seja extremamente conciso, com frases curtas e diretas. Não use saudações, introduções educadas, referências inventadas ou alegações de consulta em tempo real.",
    "Retorne somente Markdown, exatamente nesta estrutura: uma primeira frase explicando a confusão conceitual, se houver; depois o título ## A Realidade Clínica (Diretriz), com a conduta, diagnóstico ou critério correto de forma pontual e esquematizada; por fim o título ## Regra de Bolso (Para não errar mais), com um macete, mnemônico ou linha de raciocínio infalível.",
    "Use bullets quando houver mais de um item. Destaque em negrito os termos, doses ou critérios principais. Não crie outros títulos, seções ou conteúdo fora desses três tópicos.",
    "Responda somente JSON válido no formato {\"analysis\":\"markdown\"}. Escape corretamente as quebras de linha e aspas.",
  ].join("\n\n");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, { error: "Método não permitido." }, 405);
  if (corsHeaders(request)["Access-Control-Allow-Origin"] === "null") return jsonResponse(request, { error: "Origem não autorizada." }, 403);

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResponse(request, { error: "Sessão necessária." }, 401);

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) return jsonResponse(request, { error: "Sessão inválida." }, 401);

    const parsedInput = inputSchema.safeParse(await request.json());
    if (!parsedInput.success) return jsonResponse(request, { error: "Conteúdo ou formato inválido." }, 400);
    const apiKey = Deno.env.get("OQlembra_IA_KEY");
    if (!apiKey) return jsonResponse(request, { error: "A análise de IA está temporariamente indisponível. Tente novamente mais tarde." }, 503);

    const providerResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": configuredOrigin ?? "https://oqlembra.app",
        "X-Title": "OQ lembra",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-luna",
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: parsedInput.data.text },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!providerResponse.ok) {
      return jsonResponse(request, { error: providerResponse.status === 429 ? "O limite de análise foi atingido. Tente novamente em alguns instantes." : "O provedor de IA está indisponível. Tente novamente mais tarde." }, 502);
    }

    const providerData = await providerResponse.json();
    const content = providerData?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return jsonResponse(request, { error: "A IA retornou uma resposta inválida. Tente novamente." }, 502);

    let output: unknown;
    try { output = JSON.parse(content.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1")); }
    catch { return jsonResponse(request, { error: "A IA retornou uma resposta inválida. Tente novamente." }, 502); }

    const parsedOutput = responseSchema.safeParse(output);
    if (!parsedOutput.success) return jsonResponse(request, { error: "A IA retornou uma explicação incompleta. Tente novamente." }, 502);
    return jsonResponse(request, parsedOutput.data);
  } catch (error) {
    console.error(`[${functionName}] request failed`, error instanceof Error ? error.message : "unknown error");
    return jsonResponse(request, { error: "Não foi possível analisar este erro agora. Tente novamente." }, 500);
  }
});
