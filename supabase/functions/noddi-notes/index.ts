// Proxy for the Noddi user-group notes API (/v1/user-group-notes/).
// Notes written here live in Noddi so the dashboard and Noddi stay in sync.
import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { navioSourceHeaders, captureNavioSourceVersion } from "../_shared/navio-source.ts";

const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");
const NODDI_TOKEN = Deno.env.get("NODDI_API_TOKEN") || "";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function noddiHeaders(): HeadersInit {
  return {
    Authorization: `Token ${NODDI_TOKEN}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...navioSourceHeaders(),
  };
}

async function callNoddi(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: noddiHeaders() });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    console.error(`[noddi-notes] ${init.method || "GET"} ${path} -> ${res.status}`, text.slice(0, 500));
    return json({ error: "Noddi API error", status: res.status, detail: body }, res.status);
  }
  return json(body ?? {});
}

function userGroupId(payload: Record<string, unknown>): number | null {
  const id = Number(payload.user_group_id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function noteId(payload: Record<string, unknown>): number | null {
  const id = Number(payload.note_id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function noteText(payload: Record<string, unknown>): string {
  return typeof payload.content === "string" ? payload.content.trim().slice(0, 5000) : "";
}

Deno.serve(async (req) => {
  captureNavioSourceVersion(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;

    if (!NODDI_TOKEN) {
      console.error("[noddi-notes] NODDI_API_TOKEN not configured");
      return json({ error: "Noddi API token not configured" }, 500);
    }

    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(payload.action || "");

    switch (action) {
      case "list": {
        const id = userGroupId(payload);
        if (!id) return json({ error: "user_group_id required" }, 400);
        const qs = new URLSearchParams({
          user_group_ids: String(id),
          ordering: "-created_at",
          page_size: "100",
        });
        let res = await callNoddi(`/v1/user-group-notes/?${qs.toString()}`);
        if (res.status === 400 || res.status === 404) {
          // Older deployments filter on a singular `user_group` query param.
          const alt = new URLSearchParams({ user_group: String(id), page_size: "100" });
          res = await callNoddi(`/v1/user-group-notes/?${alt.toString()}`);
        }
        return res;
      }

      case "create": {
        const id = userGroupId(payload);
        const content = noteText(payload);
        if (!id) return json({ error: "user_group_id required" }, 400);
        if (!content) return json({ error: "content is required" }, 400);
        return await callNoddi(`/v1/user-group-notes/`, {
          method: "POST",
          body: JSON.stringify({ user_group: id, user_group_id: id, note: content, content }),
        });
      }

      case "update": {
        const id = noteId(payload);
        const content = noteText(payload);
        if (!id) return json({ error: "note_id required" }, 400);
        if (!content) return json({ error: "content is required" }, 400);
        return await callNoddi(`/v1/user-group-notes/${id}/`, {
          method: "PATCH",
          body: JSON.stringify({ note: content, content }),
        });
      }

      case "delete": {
        const id = noteId(payload);
        if (!id) return json({ error: "note_id required" }, 400);
        return await callNoddi(`/v1/user-group-notes/${id}/`, { method: "DELETE" });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error("[noddi-notes] unhandled error", error);
    return json({ error: String((error as Error)?.message || error) }, 500);
  }
});
