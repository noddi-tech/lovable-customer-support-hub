// Proxy for the Noddi backend ticket API.
// The Support Hub NEVER stores tickets locally — every read/write goes to Noddi.

import { extractToken, serviceClient } from "../_shared/auth.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  canAccessNavioDepartment,
  clampNavioDepartmentIds,
  resolveUserScope,
  type ScopeResult,
} from "../_shared/navio-scope.ts"
import { captureNavioSourceVersion, navioSourceHeaders } from "../_shared/navio-source.ts"

const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "")
const NODDI_TOKEN = Deno.env.get("NODDI_API_TOKEN") || ""

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

function noddiHeaders(): HeadersInit {
  return {
    Authorization: `Token ${NODDI_TOKEN}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...navioSourceHeaders(),
  }
}

async function callNoddi(path: string, init: RequestInit = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, { ...init, headers: noddiHeaders() })
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }
  if (!res.ok) {
    console.error(
      `[noddi-tickets] ${init.method || "GET"} ${path} -> ${res.status}`,
      text.slice(0, 500),
    )
    return json({ error: "Noddi API error", status: res.status, detail: body }, res.status)
  }
  return json(body ?? {})
}

/**
 * Service departments change very rarely, so one warm instance serves the whole
 * team from memory instead of hitting the Navio API on every page load.
 */
const DEPARTMENTS_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
let departmentsCache: { body: string; at: number } | null = null

async function getServiceDepartments(): Promise<Response> {
  if (departmentsCache && Date.now() - departmentsCache.at < DEPARTMENTS_TTL_MS) {
    return new Response(departmentsCache.body, {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "hit" },
    })
  }
  const res = await callNoddi(`/v1/service-departments/minimal/?page_size=200`)
  if (res.ok) {
    const body = await res.clone().text()
    departmentsCache = { body, at: Date.now() }
  }
  return res
}

/**
 * Service organizations (the Navio-side owner of bookings/tickets) change very
 * rarely too, so they share the same warm in-memory cache strategy and are only
 * refetched once the TTL expires.
 */
let organizationsCache: { body: string; at: number } | null = null

async function getServiceOrganizations(): Promise<Response> {
  if (organizationsCache && Date.now() - organizationsCache.at < DEPARTMENTS_TTL_MS) {
    return new Response(organizationsCache.body, {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "hit" },
    })
  }
  // Newer deployments expose the slim `/minimal/` variant; fall back to the
  // full list endpoint when it is not available.
  let res = await callNoddi(`/v1/service-organizations/minimal/?page_size=200`)
  if (res.status === 404) {
    res = await callNoddi(`/v1/service-organizations/?page_size=200`)
  }
  if (res.ok) {
    const body = await res.clone().text()
    organizationsCache = { body, at: Date.now() }
  }
  return res
}

const TICKET_STATUSES = ["OPEN", "SNOOZED", "RESOLVED", "ARCHIVED"]
const TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"]
const TICKET_CATEGORIES = [
  "CUSTOMER_ISSUE",
  "DAMAGE_REPORT",
  "DATA_QUALITY",
  "FOLLOW_UP",
  "INTERNAL",
  "OTHER",
  "PAYMENT",
  "TIRE_HOTEL_ISSUE",
]
const TICKET_TYPES = ["BUG", "FEATURE", "INCIDENT", "OTHER", "TASK"]

function asIntList(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => Number(v)).filter((n) => Number.isFinite(n))
}

function asEnumList(value: unknown, allowed: string[]): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v).toUpperCase()).filter((v) => allowed.includes(v))
}

function buildListQuery(payload: Record<string, unknown>, allowedDeptIds: number[] | null): string {
  const qs = new URLSearchParams()
  const pageIndex = Number(payload.page_index ?? 1)
  const pageSize = Number(payload.page_size ?? 25)
  qs.set("page_index", String(Number.isFinite(pageIndex) && pageIndex > 0 ? pageIndex : 1))
  qs.set("page_size", String(Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 1), 100) : 25))

  if (typeof payload.search === "string" && payload.search.trim()) {
    qs.set("search", payload.search.trim().slice(0, 200))
  }
  if (typeof payload.ordering === "string" && payload.ordering.trim()) {
    qs.set("ordering", payload.ordering.trim())
  }
  for (const status of asEnumList(payload.statuses, TICKET_STATUSES)) qs.append("statuses", status)
  for (const p of asEnumList(payload.priorities, TICKET_PRIORITIES)) qs.append("priorities", p)
  for (const c of asEnumList(payload.categories, TICKET_CATEGORIES)) qs.append("categories", c)
  for (const id of asIntList(payload.assignee_ids)) qs.append("assignee_ids", String(id))
  for (const id of asIntList(payload.service_department_ids))
    qs.append("service_department_ids", String(id))
  for (const id of asIntList(payload.user_group_ids)) qs.append("user_group_ids", String(id))
  for (const id of asIntList(payload.booking_ids)) qs.append("booking_ids", String(id))
  for (const id of asIntList(payload.tag_ids)) qs.append("tag_ids", String(id))
  if (typeof payload.created_at_gte === "string") qs.set("created_at_gte", payload.created_at_gte)
  if (typeof payload.created_at_lte === "string") qs.set("created_at_lte", payload.created_at_lte)

  return qs.toString()
}

function ticketId(payload: Record<string, unknown>): number | null {
  const id = Number(payload.ticket_id)
  return Number.isInteger(id) && id > 0 ? id : null
}

Deno.serve(async (req) => {
  captureNavioSourceVersion(req)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const auth = await requireUser(req)
    if ("response" in auth) return auth.response

    if (!NODDI_TOKEN) {
      console.error("[noddi-tickets] NODDI_API_TOKEN not configured")
      return json({ error: "Noddi API token not configured" }, 500)
    }

    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const action = String(payload.action || "")

    switch (action) {
      case "list":
        return await callNoddi(`/v1/tickets/?${buildListQuery(payload)}`)

      case "get": {
        const id = ticketId(payload)
        if (!id) return json({ error: "ticket_id required" }, 400)
        return await callNoddi(`/v1/tickets/${id}/`)
      }

      case "events": {
        const id = ticketId(payload)
        if (!id) return json({ error: "ticket_id required" }, 400)
        const qs = new URLSearchParams({
          ticket_ids: String(id),
          ordering: "created_at",
          page_size: "200",
        })
        return await callNoddi(`/v1/ticket-events/?${qs.toString()}`)
      }

      case "create": {
        const title = typeof payload.title === "string" ? payload.title.trim() : ""
        const departmentId = Number(payload.service_department_id)
        if (!title) return json({ error: "title is required" }, 400)
        if (!Number.isInteger(departmentId) || departmentId <= 0) {
          return json({ error: "service_department_id is required" }, 400)
        }
        const category = String(payload.category || "CUSTOMER_ISSUE").toUpperCase()
        const priority = String(payload.priority || "NORMAL").toUpperCase()
        const type = String(payload.type || "TASK").toUpperCase()
        if (!TICKET_CATEGORIES.includes(category)) return json({ error: "invalid category" }, 400)
        if (!TICKET_PRIORITIES.includes(priority)) return json({ error: "invalid priority" }, 400)
        if (!TICKET_TYPES.includes(type)) return json({ error: "invalid type" }, 400)

        const body: Record<string, unknown> = {
          title: title.slice(0, 300),
          description:
            typeof payload.description === "string" ? payload.description.slice(0, 20000) : "",
          category,
          priority,
          type,
          service_department_id: departmentId,
          source: "SUPPORT_APP",
        }
        for (const key of ["assignee_id", "booking_id", "user_group_id", "user_group_car_id"]) {
          const value = Number(payload[key])
          if (Number.isInteger(value) && value > 0) body[key] = value
        }
        if (typeof payload.due_at === "string" && payload.due_at) body.due_at = payload.due_at
        const tagIds = asIntList(payload.tag_ids)
        if (tagIds.length) body.tag_ids = tagIds

        return await callNoddi(`/v1/tickets/`, { method: "POST", body: JSON.stringify(body) })
      }

      case "patch": {
        const id = ticketId(payload)
        if (!id) return json({ error: "ticket_id required" }, 400)
        const patch = (payload.patch ?? {}) as Record<string, unknown>
        const body: Record<string, unknown> = {}
        if (typeof patch.title === "string") body.title = patch.title.slice(0, 300)
        if (typeof patch.description === "string")
          body.description = patch.description.slice(0, 20000)
        if (
          typeof patch.category === "string" &&
          TICKET_CATEGORIES.includes(patch.category.toUpperCase())
        ) {
          body.category = patch.category.toUpperCase()
        }
        if (
          typeof patch.priority === "string" &&
          TICKET_PRIORITIES.includes(patch.priority.toUpperCase())
        ) {
          body.priority = patch.priority.toUpperCase()
        }
        if (typeof patch.type === "string" && TICKET_TYPES.includes(patch.type.toUpperCase())) {
          body.type = patch.type.toUpperCase()
        }
        if (typeof patch.due_at === "string" || patch.due_at === null) body.due_at = patch.due_at
        if (Array.isArray(patch.tag_ids)) body.tag_ids = asIntList(patch.tag_ids)
        for (const key of ["booking_id", "user_group_id", "user_group_car_id"]) {
          if (key in patch) {
            const value = patch[key] === null ? null : Number(patch[key])
            body[key] = value === null || Number.isInteger(value) ? value : null
          }
        }
        if (!Object.keys(body).length) return json({ error: "nothing to update" }, 400)
        return await callNoddi(`/v1/tickets/${id}/`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      }

      case "comment": {
        const id = ticketId(payload)
        if (!id) return json({ error: "ticket_id required" }, 400)
        const comment = typeof payload.comment === "string" ? payload.comment.trim() : ""
        if (!comment) return json({ error: "comment is required" }, 400)
        return await callNoddi(`/v1/tickets/${id}/comment/`, {
          method: "POST",
          body: JSON.stringify({
            comment: comment.slice(0, 20000),
            mentioned_user_ids: asIntList(payload.mentioned_user_ids),
          }),
        })
      }

      case "assign": {
        const id = ticketId(payload)
        if (!id) return json({ error: "ticket_id required" }, 400)
        const assignee = payload.assignee_id === null ? null : Number(payload.assignee_id)
        return await callNoddi(`/v1/tickets/${id}/assign/`, {
          method: "POST",
          body: JSON.stringify({
            assignee_id: assignee === null || !Number.isInteger(assignee) ? null : assignee,
          }),
        })
      }

      case "resolve": {
        const id = ticketId(payload)
        if (!id) return json({ error: "ticket_id required" }, 400)
        const note =
          typeof payload.resolution_note === "string" ? payload.resolution_note.slice(0, 5000) : ""
        return await callNoddi(`/v1/tickets/${id}/resolve/`, {
          method: "POST",
          body: JSON.stringify({ resolution_note: note }),
        })
      }

      case "snooze": {
        const id = ticketId(payload)
        if (!id) return json({ error: "ticket_id required" }, 400)
        const until = typeof payload.snoozed_until === "string" ? payload.snoozed_until : ""
        if (!until) return json({ error: "snoozed_until required" }, 400)
        return await callNoddi(`/v1/tickets/${id}/snooze/`, {
          method: "POST",
          body: JSON.stringify({ snoozed_until: until }),
        })
      }

      case "reopen":
      case "archive":
      case "restore": {
        const id = ticketId(payload)
        if (!id) return json({ error: "ticket_id required" }, 400)
        return await callNoddi(`/v1/tickets/${id}/${action}/`, { method: "POST", body: "{}" })
      }

      case "departments":
        return await getServiceDepartments()

      case "organizations":
        return await getServiceOrganizations()

      case "tags":
        return await callNoddi(`/v1/tags/?page_size=200`)

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (error) {
    console.error("[noddi-tickets] Unhandled error", error)
    return json({ error: "Internal error" }, 500)
  }
})
