import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkerRequest {
  queue_id: string;
}

interface ProcessQueueRowResult {
  claimed: boolean;
  status?: "success" | "failed";
  duration_ms?: number;
  execution_id?: string;
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = performance.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return json({ error: "Worker not configured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = (await req.json()) as WorkerRequest;
    const queueId = payload?.queue_id;
    if (!queueId || typeof queueId !== "string") {
      return json({ error: "Missing queue_id in body" }, 400);
    }

    // 1) Self-heal: reap any row stuck in 'processing' > 2 min
    const { data: reapedCount, error: reapErr } = await supabase.rpc(
      "reap_stuck_queue_rows",
    );
    if (reapErr) {
      console.error("reap_stuck_queue_rows error:", reapErr);
      // Non-fatal: worker can still try to claim the target row
    } else if ((reapedCount ?? 0) > 0) {
      console.log(`[reap] reclaimed ${reapedCount} stuck row(s) back to pending`);
    }

    // 2) Claim + dispatch the target row
    console.log(`[claim] attempting queue_id=${queueId}`);
    const { data, error } = await supabase.rpc("process_automation_queue_row", {
      p_queue_id: queueId,
    });

    if (error) {
      console.error(`[dispatch] rpc error for queue_id=${queueId}:`, error);
      return json(
        {
          ok: false,
          queue_id: queueId,
          error: error.message,
          duration_ms: Math.round(performance.now() - startedAt),
        },
        200,
      );
    }

    const result = data as ProcessQueueRowResult;
    if (!result?.claimed) {
      console.log(`[claim] not claimed queue_id=${queueId} reason="${result?.reason ?? "unknown"}"`);
      return json(
        {
          ok: true,
          claimed: false,
          queue_id: queueId,
          reason: result?.reason ?? "unknown",
          duration_ms: Math.round(performance.now() - startedAt),
        },
        200,
      );
    }

    console.log(
      `[dispatch] queue_id=${queueId} execution_id=${result.execution_id} ` +
        `status=${result.status} duration_ms=${result.duration_ms}`,
    );

    return json(
      {
        ok: true,
        claimed: true,
        queue_id: queueId,
        execution_id: result.execution_id,
        status: result.status,
        dispatch_duration_ms: result.duration_ms,
        total_duration_ms: Math.round(performance.now() - startedAt),
      },
      200,
    );
  } catch (err: unknown) {
    const e = err as Error;
    console.error("process-automation-queue unhandled error:", e);
    return json(
      {
        ok: false,
        error: e?.message ?? "Unknown error",
        duration_ms: Math.round(performance.now() - startedAt),
      },
      200,
    );
  }
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(handler);
