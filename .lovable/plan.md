

# URGENT: Hide Knowledge Search to Stop PII Leak

## The Problem

The "Søk i hjelpesenter" (Knowledge Search) feature and the AI chat's `search_knowledge_base` tool are exposing raw customer data to the public widget. The `knowledge_entries` table contains unredacted customer emails with full names, phone numbers, addresses, and payment information. Any visitor can search and retrieve this data.

**Two leak vectors:**
1. **Knowledge Search view** — `widget-search-faq` returns raw `customer_context`/`agent_response` directly to the browser
2. **AI Chat** — `search_knowledge_base` tool feeds raw entries to the LLM, which can quote PII verbatim

## Immediate Fix: Disable Both Vectors

### 1. Edge function: `supabase/functions/widget-search-faq/index.ts`
- Add an early return that always returns empty results, effectively killing the endpoint
- This stops the Knowledge Search view from returning any data

### 2. Edge function: `supabase/functions/widget-ai-chat/index.ts`
- Remove `search_knowledge_base` from the tools array passed to the LLM
- Remove the case handler in `executeToolCall`
- This prevents the AI from accessing knowledge entries

### 3. Widget UI: `src/widget/components/WidgetPanel.tsx`
- Remove the `enableKnowledgeSearch` button from the home screen (the "Søk i hjelpesenter" action)
- Remove the `search` view rendering block
- Keep the AI chat available (it will still work for bookings, customer lookup etc. — just without knowledge search)

### 4. Widget UI: `src/widget/components/WidgetPanel.tsx` (home view)
- Also hide the standalone "Søk i hjelpesenter" action button that leads to the dedicated search view

### 5. Deploy both edge functions

## What stays working
- AI chat (booking flows, customer lookup, cancellations, rescheduling)
- Live chat
- Contact form
- All other widget functionality

## Future: When re-enabling
Before re-enabling knowledge search, the `knowledge_entries` data must be sanitized to strip PII (names, phones, emails, addresses) from `customer_context` and `agent_response` fields. This is a separate task.

