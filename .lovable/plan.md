

## Speed Up AI Chatbot — Performance Optimization Plan

### Root Causes of Slowness

After reviewing the 2,888-line `widget-ai-chat` edge function, here are the serial bottlenecks causing multi-second delays:

**1. Sequential tool execution (biggest issue)**
Lines 2655-2713: When OpenAI returns multiple `tool_calls`, they are executed one-by-one in a `for` loop. Each tool call (MCP or REST) takes 200-800ms. With 2-3 parallel tool calls, this wastes 400-1600ms.

**2. Double customer lookup in `executeLookupCustomer`**
Lines 1297-1695: Makes TWO sequential REST calls — first `customer-lookup-support`, then `bookings-for-customer`. Each takes ~500ms. These could run in parallel.

**3. Redundant customer re-lookups in post-processors**
- `patchBookingSummary` (line 468) does a FRESH `executeLookupCustomer()` call every time a booking summary is processed — adds ~1s.
- `patchBookingEdit` (line 1221) does another fresh lookup as fallback — adds ~1s.
These re-lookups exist only to get `user_id`/`user_group_id`, which are already available from the first lookup in the tool loop.

**4. Fake streaming**
Lines 2852-2888: The entire tool loop runs synchronously (blocking), then the final reply is "streamed" as fake SSE with 30ms word-by-word delays. The user sees nothing until ALL tool calls finish.

**5. 8 sequential OpenAI round-trips possible**
Lines 2571-2732: Each iteration calls OpenAI (200-400ms) + tools (200-800ms). A 3-iteration flow = ~2-3s just in API latency.

### Optimizations (ordered by impact)

#### Fix 1: Parallelize tool execution
Change the `for` loop at line 2655 to `Promise.all()`. When OpenAI returns 2+ tool_calls, execute them concurrently.

**Impact**: Saves 200-800ms per multi-tool response (common in lookup + knowledge search combos).

#### Fix 2: Parallelize the two REST calls in `executeLookupCustomer`
Run `customer-lookup-support` and `bookings-for-customer` with `Promise.all()` instead of sequentially.

**Impact**: Saves ~500ms on every customer lookup (the most common tool call).

#### Fix 3: Cache customer data to eliminate redundant re-lookups
Pass the customer data (user_id, user_group_id) through the tool loop as a local variable instead of re-fetching in `patchBookingSummary` and `patchBookingEdit`. Extract the IDs from the `lookup_customer` tool result that's already in `currentMessages`.

**Impact**: Saves ~1-2s on booking summary and edit flows by eliminating 1-2 redundant API calls.

#### Fix 4: Stream the final OpenAI response directly
Instead of waiting for the full response then faking SSE, use `stream: true` on the final OpenAI call and pipe tokens directly to the client. This gives the user visual feedback ~1-2s earlier.

**Impact**: Perceived latency reduction of ~1-2s (user sees first words immediately).

#### Fix 5: Early response for pure-marker outputs
When the AI's response is entirely a UI marker (e.g., `[ADDRESS_SEARCH]`, `[TIME_SLOT]`, `[LICENSE_PLATE]`), skip the fake streaming delay and send immediately.

**Impact**: Saves ~300-500ms on marker-only responses.

### Files Changed

| File | Changes |
|---|---|
| `supabase/functions/widget-ai-chat/index.ts` | Parallelize tool execution, parallelize customer lookup REST calls, cache customer IDs to skip re-lookups, stream final response directly, skip streaming delay for markers |

### What stays the same
- System prompt, tool definitions, post-processors — all unchanged
- MCP integration — unchanged
- Rate limiting, persistence, error tracking — unchanged

### Expected Improvement
- **Typical verified-user flow** (lookup + bookings): ~2-3s faster
- **Booking edit flow** (time slot selection): ~1-2s faster
- **General questions** (knowledge search): ~0.5s faster
- **Perceived latency** (streaming): ~1-2s earlier first token

