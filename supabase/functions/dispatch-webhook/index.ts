import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DispatchWebhookRequest {
  url: string;
  headers?: Record<string, string> | null;
  body: Record<string, unknown>;
  message_template?: string | null;
}

interface DispatchWebhookResponse {
  success: boolean;
  http_status: number | null;
  response_excerpt: string;
  duration_ms: number;
  error: string | null;
}

const TIMEOUT_MS = 10_000;
const RESPONSE_EXCERPT_MAX = 2048;

/**
 * Substitute {{foo.bar}} patterns in `template` using values from `scope`.
 * Unknown / unresolved paths stay literal. No recursion, no escaping.
 */
function renderMessageTemplate(template: string, scope: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path: string) => {
    const parts = path.split(".");
    let cur: unknown = scope;
    for (const part of parts) {
      if (cur !== null && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[part];
      } else {
        return match;
      }
    }
    if (cur === null || cur === undefined) return match;
    if (typeof cur === "object") return JSON.stringify(cur);
    return String(cur);
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = performance.now();

  try {
    const payload = (await req.json()) as DispatchWebhookRequest;
    const { url, headers, body, message_template } = payload;

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'url'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (body === undefined || body === null || typeof body !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'body' (must be an object)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build outbound payload
    let outboundBody: unknown;
    if (message_template && typeof message_template === "string") {
      // Render with the request body as the substitution scope, so callers
      // can use {{context.foo}}, {{rule.bar}}, {{event.baz}}, etc.
      const rendered = renderMessageTemplate(message_template, body as Record<string, unknown>);
      outboundBody = { text: rendered };
    } else {
      outboundBody = body;
    }

    const outboundHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (headers && typeof headers === "object") {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") outboundHeaders[k] = v;
      }
    }

    // Enforce 10s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: outboundHeaders,
        body: JSON.stringify(outboundBody),
        signal: controller.signal,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      const durationMs = Math.round(performance.now() - startedAt);
      const err = fetchErr as Error;
      const aborted = err?.name === "AbortError";
      const result: DispatchWebhookResponse = {
        success: false,
        http_status: null,
        response_excerpt: "",
        duration_ms: durationMs,
        error: aborted
          ? `Timed out after ${TIMEOUT_MS}ms`
          : `fetch failed: ${err?.message ?? String(fetchErr)}`,
      };
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    clearTimeout(timeoutId);

    const text = await response.text();
    const durationMs = Math.round(performance.now() - startedAt);

    const result: DispatchWebhookResponse = {
      success: response.ok,
      http_status: response.status,
      response_excerpt: text.slice(0, RESPONSE_EXCERPT_MAX),
      duration_ms: durationMs,
      error: response.ok ? null : `Webhook returned HTTP ${response.status}`,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const durationMs = Math.round(performance.now() - startedAt);
    const err = error as Error;
    console.error("Error in dispatch-webhook:", err);
    const result: DispatchWebhookResponse = {
      success: false,
      http_status: null,
      response_excerpt: "",
      duration_ms: durationMs,
      error: err?.message ?? "Unknown error",
    };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
