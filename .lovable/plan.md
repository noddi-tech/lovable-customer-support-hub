

## Use Navio MCP Server for AI Chatbot — Analysis and Plan

### Current State

The `widget-ai-chat` edge function is **2,675 lines**. Roughly **1,200+ lines** are hand-coded Noddi API integrations: `executeLookupCustomer` (~300 lines of response parsing), `executeGetBookingDetails`, `executeRescheduleBooking`, `executeCancelBooking`, `executeBookingProxy`, plus helpers like `extractPlateString`, `toOsloTime`, car/address extraction from 5+ different Noddi response shapes.

Every time Noddi changes an API response field (e.g., `booking_items_car` vs `booking_items` vs `cars`), you patch the edge function. This is fragile.

### The Navio MCP Server

The MCP server at `mcp.noddi.co/mcp` exposes **16 tools** over Streamable HTTP (standard JSON-RPC):

| Current edge function tool | MCP equivalent |
|---|---|
| `lookup_customer` (phone + NODDI_API_TOKEN) | `customer_lookup` (auth_token) |
| `get_booking_details` | `booking_details_get` |
| `reschedule_booking` | `booking_update` |
| `cancel_booking` | `booking_cancel` |
| `lookup_car_by_plate` | `car_lookup` |
| `list_available_services` | `sales_item_list` |
| `get_available_items` | `sales_item_list` (combined) |
| `get_delivery_windows` | `delivery_window_get` |
| `create_shopping_cart` | `booking_create` |
| `update_booking` | `booking_update` |
| — (not available) | `address_list`, `car_list`, `booking_list`, `booking_history_list`, `earliest_booking_date_get`, `booking_request_collect` |

### Recommendation: Yes, migrate — but incrementally

**Why it makes sense:**

1. **Remove ~1,200 lines** of brittle Noddi API parsing code
2. **Single source of truth** — Navio team maintains the MCP server; API field changes are handled there, not here
3. **Richer toolset** — `address_list`, `car_list`, `booking_list`, `earliest_booking_date_get` are new capabilities the chatbot gains for free
4. **Cleaner auth model** — MCP's `login_sms_send` + `login_phone_code_exchange` maps directly to the existing phone verification UI; the resulting `auth_token` is passed to subsequent calls (no more server-side `NODDI_API_TOKEN` for customer-facing operations)

**What stays in the edge function:**
- OpenAI tool-calling loop (unchanged)
- Knowledge base search (`search_knowledge_base`) — Supabase-local, not in MCP
- UI marker post-processing (`patchBookingSummary`, `patchBookingInfo`, etc.)
- Conversation persistence, analytics, error tracking
- Rate limiting, system prompt, action flows

### Architecture

```text
┌─────────────────────────────────────────────────┐
│  widget-ai-chat edge function                   │
│                                                 │
│  OpenAI ←→ Tool-calling loop                    │
│       │                                         │
│       ├── search_knowledge_base → Supabase RPC  │
│       │                                         │
│       └── All Noddi tools ──→ MCP Client ──────────→ mcp.noddi.co/mcp
│                                    │                  (JSON-RPC / HTTP)
│                              auth_token                    │
│                              (per conversation)            ▼
│                                                    Noddi REST API
│  Post-processing (UI markers)                   │
│  Conversation persistence                       │
└─────────────────────────────────────────────────┘
```

### Key change: Auth token per conversation

Currently the edge function uses a single `NODDI_API_TOKEN` (server token). The MCP server uses **per-customer auth tokens** from SMS verification.

The phone verification flow already exists in the widget UI. The change:

1. When the user verifies their phone, call MCP's `login_sms_send` and `login_phone_code_exchange` instead of the current Supabase-based verification
2. Store the returned `auth_token` in the conversation context (memory, not DB — it's session-scoped)
3. Pass `auth_token` to all subsequent MCP tool calls that require it

For unauthenticated tools (`car_lookup`, `sales_item_list`, `delivery_window_get`), no token is needed.

### Implementation Plan

#### 1. Create MCP client helper (~80 lines)

Add a lightweight MCP client to the edge function that sends JSON-RPC requests to `mcp.noddi.co/mcp`:

```typescript
async function callMcpTool(name: string, args: Record<string, any>): Promise<any> {
  const resp = await fetch('https://mcp.noddi.co/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}
```

#### 2. Replace execute* functions with MCP calls

Map each OpenAI tool to an MCP call + a thin response adapter (to keep the response shape compatible with existing post-processors):

| Function to remove | Replaced by |
|---|---|
| `executeLookupCustomer` (~300 lines) | `callMcpTool('customer_lookup', { auth_token })` + thin mapper |
| `executeGetBookingDetails` (~40 lines) | `callMcpTool('booking_details_get', { booking_id, auth_token })` |
| `executeRescheduleBooking` (~30 lines) | `callMcpTool('booking_update', { booking_id, ..., auth_token })` |
| `executeCancelBooking` (~30 lines) | `callMcpTool('booking_cancel', { booking_id, auth_token })` |
| `executeBookingProxy` | `callMcpTool('booking_create', { ... })` |
| Car/service/delivery helpers | `callMcpTool('car_lookup'/'sales_item_list'/'delivery_window_get', ...)` |

#### 3. Update OpenAI tool definitions

Align the tool parameter schemas with MCP's tool schemas. Add new tools that MCP provides (`address_list`, `car_list`, `booking_list`, `earliest_booking_date_get`).

#### 4. Wire phone verification to MCP auth

Replace the current phone verification edge function calls with:
- `callMcpTool('login_sms_send', { phone_number })` — send SMS
- `callMcpTool('login_phone_code_exchange', { phone_number, code })` — get `auth_token`

Store `auth_token` in conversation metadata (Supabase row or passed through messages).

#### 5. Keep post-processors as-is

The UI marker logic (`patchBookingSummary`, `patchBookingInfo`, etc.) stays. These adapt MCP responses into widget UI components — that's this system's responsibility, not MCP's.

### What NOT to change

- Knowledge base search — stays Supabase-local
- System prompt and action flows — stays
- Conversation persistence and analytics — stays
- Rate limiting — stays
- Widget UI components — stays (they consume the same markers)

### Risk Assessment

- **Low risk**: MCP public endpoint requires no ingress auth; tools are the same Noddi API operations
- **Response shape differences**: MCP may return slightly different field names — the thin mapper handles this. Start with `customer_lookup` (the most complex) as a proof-of-concept
- **Fallback**: Keep `NODDI_API_TOKEN` as a fallback if MCP is unreachable
- **Latency**: One extra hop (edge function → MCP → Noddi API), but MCP is lightweight JSON-RPC

### Files changed

| File | Change |
|---|---|
| `supabase/functions/widget-ai-chat/index.ts` | Add MCP client, replace execute* functions, update tool definitions, wire auth |

### Suggested approach: Phased migration

**Phase 1** — Add MCP client + migrate `car_lookup` and `sales_item_list` (unauthenticated tools, lowest risk)

**Phase 2** — Migrate `customer_lookup`, `booking_details_get` (authenticated, test with MCP auth flow)

**Phase 3** — Migrate write operations (`booking_create`, `booking_update`, `booking_cancel`) and remove `NODDI_API_TOKEN` dependency for customer-facing operations

This keeps the system working at every phase with easy rollback.

