
# Refactor AI Chatbot: Knowledge-First + Intent-Triggered Action Flows

## The Problem

The current AI chatbot uses a single monolithic flow tree (`ai_flow_config`) that forces every conversation through a rigid path: Greeting -> Phone Verification -> Customer Lookup -> Action Menu -> Sub-flows. This is too restrictive for a capable AI agent that should be able to answer questions freely and only activate structured flows when needed.

## The New Architecture

```text
+--------------------------------------------------+
|              KNOWLEDGE LAYER (default)            |
|  AI answers any question using knowledge base     |
|  RAG search via find_similar_responses            |
+--------------------------------------------------+
              |
              | Intent detected
              v
+--------------------------------------------------+
|           INTENT ROUTER (AI-driven)               |
|  Detects: book, change_time, change_address,      |
|  change_car, add_services, cancel, view_bookings  |
+--------------------------------------------------+
              |
              v
+--------------------------------------------------+
|         ACTION FLOWS (one per intent)             |
|  Each is a self-contained micro-flow with         |
|  its own steps, markers, and completion logic     |
+--------------------------------------------------+
```

The AI operates in two modes:
1. **Free conversation mode** (default) -- answers questions from the knowledge base, chats naturally
2. **Action flow mode** (triggered by intent) -- follows a structured step-by-step flow for a specific action (e.g., booking, cancellation)

## What Changes

### 1. New Database Schema: `ai_action_flows` table

Replace the single `ai_flow_config` JSON column with a dedicated table of action flows.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | FK to organizations |
| widget_config_id | uuid | FK to widget_configs |
| intent_key | text | e.g., "new_booking", "change_time", "cancel_booking" |
| label | text | Display name, e.g., "Book New Service" |
| description | text | When this flow should activate |
| trigger_phrases | text[] | Example phrases that trigger this flow |
| requires_verification | boolean | Whether phone verification is needed first |
| flow_steps | jsonb | Ordered array of step definitions |
| is_active | boolean | Enable/disable per flow |
| sort_order | int | Display ordering |
| created_at / updated_at | timestamps | |

The `flow_steps` JSON is a simple ordered array (not a tree):
```json
[
  {"id": "step_1", "type": "collect", "field": "address", "marker": "ADDRESS_SEARCH", "instruction": "Collect delivery address"},
  {"id": "step_2", "type": "collect", "field": "license_plate", "marker": "LICENSE_PLATE", "instruction": "Collect car info"},
  {"id": "step_3", "type": "collect", "field": "service", "marker": "SERVICE_SELECT", "instruction": "Choose service"},
  {"id": "step_4", "type": "collect", "field": "time_slot", "marker": "TIME_SLOT", "instruction": "Pick delivery window"},
  {"id": "step_5", "type": "confirm", "marker": "BOOKING_SUMMARY", "instruction": "Show summary and confirm"}
]
```

### 2. Seed Default Action Flows

Create these built-in flows:

| Intent Key | Label | Requires Verification | Steps |
|------------|-------|----------------------|-------|
| new_booking | Book New Service | Yes | Address -> Car -> Service -> Time Slot -> Summary |
| change_time | Change Booking Time | Yes | Lookup booking -> Time Slot picker -> Booking Edit confirm |
| change_address | Change Booking Address | Yes | Lookup booking -> Address Search -> Booking Edit confirm |
| change_car | Change Booking Car | Yes | Lookup booking -> License Plate -> Booking Edit confirm |
| add_services | Add Services to Booking | Yes | Lookup booking -> Service Select -> Booking Edit confirm |
| cancel_booking | Cancel Booking | Yes | Lookup booking -> Confirm cancellation |
| view_bookings | View My Bookings | Yes | Lookup customer -> Display bookings |

### 3. Refactor `widget-ai-chat` Edge Function

**System prompt restructuring:**
- Remove the monolithic `buildFlowPrompt` / `buildNodePrompt` / `buildPostVerificationNodes` functions (~300 lines)
- Replace with a simpler prompt that:
  1. Instructs the AI to answer general questions using the knowledge base
  2. Lists available action flows with their trigger phrases
  3. When an intent is detected, provides the step-by-step instructions for that specific flow
  4. Keeps all marker documentation (ADDRESS_SEARCH, LICENSE_PLATE, etc.) unchanged

The new system prompt structure:
```text
You are Noddi's AI assistant.

MODE 1 — GENERAL CONVERSATION (default):
- Answer questions using search_knowledge_base
- Be friendly, concise, helpful
- If no knowledge found, say so honestly

MODE 2 — ACTION FLOWS (triggered by customer intent):
Available actions:
- "new_booking": Customer wants to book a service. Steps: [address] -> [car] -> [service] -> [time] -> [confirm]
- "change_time": Customer wants to change booking time. Steps: [identify booking] -> [new time] -> [confirm]
- "cancel_booking": Customer wants to cancel. Steps: [identify booking] -> [confirm]
...

All action flows that require verification will prompt [PHONE_VERIFY] first.

INTERACTIVE MARKERS: (unchanged — same marker docs as today)
```

**Key simplification:** The `ai_flow_config` tree traversal code (buildNodePrompt, buildPostVerificationNodes, findPathToPhoneNode, etc. -- ~400 lines) gets replaced by a simple loop over the `ai_action_flows` records to build the prompt.

### 4. Refactor Admin UI: Flow Builder -> Action Flows Manager

Replace the current complex tree-based Flow Builder (1538 lines) with a simpler **Action Flows** interface:

**Layout:**
- List of action flow cards (one per intent)
- Click a card to edit its steps
- Each step is a simple row: type, field, marker, instruction
- Drag to reorder steps within a flow
- Toggle flows on/off

**Tabs update in AiChatbotSettings.tsx:**
- Rename "Flow" tab to "Action Flows"
- Replace AiFlowBuilder component with new ActionFlowsManager component
- Keep Components, Test, Conversations, Analytics, and Gaps tabs as-is

### 5. Keep `ai_flow_config` as Fallback

During the transition, the edge function will:
1. Check for `ai_action_flows` records first
2. Fall back to `ai_flow_config` if no action flows exist
3. This ensures existing widget configs continue working

### 6. General Rules Move to Widget Config

The `general_rules` (tone, language behavior, escalation threshold) currently inside `ai_flow_config` will be stored as separate columns on `widget_configs` or as a `ai_general_config` JSON column, so they persist independently of action flows.

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| Migration SQL | Create | `ai_action_flows` table + seed data + RLS |
| Migration SQL | Create | Add `ai_general_config` column to `widget_configs` |
| `supabase/functions/widget-ai-chat/index.ts` | Refactor | Replace tree prompt builder with action-flow prompt builder (~400 lines removed, ~150 added) |
| `src/components/admin/widget/ActionFlowsManager.tsx` | Create | New admin UI for managing action flows |
| `src/components/admin/widget/AiChatbotSettings.tsx` | Edit | Replace Flow tab with Action Flows tab |
| `src/components/admin/widget/AiFlowBuilder.tsx` | Keep | Keep file but stop importing it (can remove later) |
| `docs/NODDI_API_ENDPOINTS.md` | Update | Document the new architecture |

## Why This is Better

1. **Customers can ask anything** without being funneled through a rigid greeting -> verify -> menu flow
2. **Each action flow is independently editable** -- changing the booking flow doesn't affect the cancellation flow
3. **New flows can be added** by just inserting a database row (no code changes needed)
4. **Simpler admin UI** -- ordered steps instead of a complex recursive tree with goto nodes
5. **Knowledge base becomes primary** -- the AI is genuinely helpful for FAQ-style questions without requiring phone verification first
6. **Scalable** -- adding a new action (e.g., "check tire storage status") is just one new flow record
