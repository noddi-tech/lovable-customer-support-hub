# AI & Intelligence System — Technical Reference

> **Audience:** Developers, AI/LLM models, and technical stakeholders who need to understand, extend, or debug the AI-powered customer assistant and knowledge management infrastructure.

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [AI Chatbot Engine (`widget-ai-chat`)](#2-ai-chatbot-engine-widget-ai-chat)
3. [Interactive Component Registry](#3-interactive-component-registry)
4. [Action Flows System](#4-action-flows-system)
5. [Knowledge Management System](#5-knowledge-management-system)
6. [Agent-Side Knowledge Features](#6-agent-side-knowledge-features)
7. [AI Chatbot Admin Portal](#7-ai-chatbot-admin-portal)
8. [Database Schema Reference](#8-database-schema-reference)
9. [Edge Functions Reference](#9-edge-functions-reference)
10. [Adding New Features (Developer Guide)](#10-adding-new-features-developer-guide)

---

## 1. Overview & Architecture

The AI system operates on a **"Knowledge-First + Intent-Triggered Action Flows"** model with two distinct operational modes:

| Mode | Purpose | Trigger |
|------|---------|---------|
| **General Conversation** | Answer questions using the Knowledge Base (RAG) | Default — any customer question |
| **Action Flows** | Execute structured business operations (book, reschedule, cancel) | Customer expresses a specific intent matching a configured flow |

### Data Flow

```
┌──────────────┐     POST /widget-ai-chat      ┌─────────────────────────────────┐
│  Chat Widget │ ──────────────────────────────▶│  widget-ai-chat Edge Function   │
│  (React)     │                                │  (~2675 lines)                  │
└──────────────┘                                │                                 │
                                                │  1. Rate limit check            │
       SSE stream or                            │  2. Widget config lookup        │
       JSON response                            │  3. Action flow loading         │
            ▲                                   │  4. System prompt construction  │
            │                                   │  5. OpenAI tool-calling loop    │
            │                                   │     (max 8 iterations)          │
            │                                   │  6. Post-processor pipeline     │
            │                                   │  7. Persist conversation        │
            │                                   │  8. Stream/return response      │
            │                                   └────────┬──────────┬────────────┘
            │                                            │          │
            │                                            ▼          ▼
            │                                    ┌──────────┐ ┌──────────────┐
            │                                    │  OpenAI   │ │  Supabase DB │
            │                                    │ gpt-4o-   │ │  (pgvector,  │
            │                                    │ mini      │ │  persistence)│
            │                                    └──────────┘ └──────────────┘
            │                                         │
            │              Tool calls                 │
            │    ┌────────────────────────────────────┘
            │    ▼
            │  ┌──────────────────────────────────┐
            │  │  11 Registered Tools              │
            │  │  • search_knowledge_base          │
            │  │  • lookup_customer                │
            │  │  • get_booking_details            │
            │  │  • reschedule_booking             │
            │  │  • cancel_booking                 │
            │  │  • update_booking                 │
            │  │  • lookup_car_by_plate            │
            │  │  • list_available_services        │
            │  │  • get_available_items             │
            │  │  • get_delivery_windows           │
            │  │  • create_shopping_cart            │
            │  └──────────────────────────────────┘
            │
            │  Post-processors (in order):
            │  ┌──────────────────────────────────┐
            └──│  patchBookingSummaryTime          │
               │  patchBookingSummary              │
               │  patchTimeSlotConfirmToEdit       │
               │  patchBookingEdit                 │
               │  patchBookingConfirmed            │
               │  patchBookingInfo                 │
               │  patchGroupSelect                 │
               │  patchActionMenu                  │
               │  patchYesNo                       │
               └──────────────────────────────────┘
```

---

## 2. AI Chatbot Engine (`widget-ai-chat`)

**File:** `supabase/functions/widget-ai-chat/index.ts` (~2675 lines)

### 2.1 Request / Response Contract

```typescript
interface RequestBody {
  widgetKey: string;            // Widget identifier (from widget_configs.widget_key)
  messages: AiMessage[];        // Conversation history [{role, content}]
  visitorPhone?: string;        // Visitor's phone (set after verification)
  visitorEmail?: string;        // Visitor's email
  language?: string;            // Language code (default: 'no')
  test?: boolean;               // Test mode — skips persistence
  stream?: boolean;             // Enable SSE streaming
  conversationId?: string;      // Existing conversation ID for continuity
  isVerified?: boolean;         // Whether phone is OTP-verified
}

// Response: JSON { reply, conversationId, messageId }
// Or SSE stream with events: { type: 'meta' | 'token' | 'done', ... }
```

### 2.2 Rate Limiting

In-memory per-widget rate limiter:
- **Window:** 60 seconds
- **Max requests:** 20 per widget key per window
- Resets on cold start (edge function re-deploy)

### 2.3 System Prompt Construction

The `buildSystemPrompt(language, isVerified, actionFlows, generalConfig)` function assembles a comprehensive system prompt from four components:

| Component | Source | Description |
|-----------|--------|-------------|
| **Language instruction** | `language` param | Tells AI to match customer language (Norwegian bokmål by default) |
| **Verification context** | `isVerified` flag | Defines two modes — general conversation (unverified) vs full account access (verified) |
| **Action flow instructions** | `ai_action_flows` table | Dynamically built from active flows via `buildActionFlowsPrompt()` |
| **General rules** | `widget_configs.ai_general_config` | Tone, response length, escalation threshold, language behavior |
| **Interactive component reference** | Hardcoded | Complete marker syntax guide for all 17 UI blocks |

#### Verification Modes

**Unverified mode:**
- Can answer general questions via `search_knowledge_base`
- Cannot access customer data or perform actions
- Must prompt `[PHONE_VERIFY]` before any account-specific flow

**Verified mode:**
- Full access to `lookup_customer` and all action flows
- AI greets customer by name after lookup
- Proceeds directly to matched flow steps
- Critical rules: never re-ask for known data, never list stored addresses/vehicles as text

#### General Rules Configuration

Stored in `widget_configs.ai_general_config` (JSON column):

```typescript
interface GeneralConfig {
  tone?: string;                    // e.g., "friendly, concise, helpful"
  max_initial_lines?: number;       // Max lines before presenting choices (default: 4)
  never_dump_history?: boolean;     // Never dump full booking history unprompted
  language_behavior?: string;       // e.g., "Match the customer's language"
  escalation_threshold?: number;    // Turns before offering human agent (default: 3)
}
```

### 2.4 OpenAI Tool-Calling Loop

**Model:** `gpt-4o-mini`  
**Temperature:** 0.7  
**Max tokens:** 1024  

The engine runs a **non-streaming tool-calling loop** with these safety mechanisms:

| Safety Mechanism | Description |
|-----------------|-------------|
| **8-iteration cap** | Maximum 8 sequential OpenAI calls per request |
| **Per-tool circuit breaker** | Max 3 calls per tool (2 for `get_delivery_windows`) |
| **Cancel confirmation guard** | `cancel_booking` blocked unless conversation contains user confirmation ("ja"/"yes"/"bekreft") |
| **Group selection break** | Loop breaks when `lookup_customer` returns `needs_group_selection: true` |
| **Tool response padding** | Unanswered tool calls get synthetic error responses to satisfy OpenAI API |
| **Forced final response** | After loop break, one more call with `tool_choice: "none"` to force text output |
| **True fallback** | If forced response also fails, returns a hardcoded apology message |

#### 11 Registered Tools

| Tool | Description | External API |
|------|-------------|-------------|
| `search_knowledge_base` | Semantic search via pgvector embeddings | OpenAI Embeddings API |
| `lookup_customer` | Find customer by phone/email | Noddi API |
| `get_booking_details` | Get booking by ID | Noddi API |
| `reschedule_booking` | Reschedule to new date/time | Noddi API |
| `cancel_booking` | Cancel a booking (guarded) | Noddi API |
| `update_booking` | Update address/cars/items/window | Noddi API |
| `lookup_car_by_plate` | License plate → car details | Noddi API |
| `list_available_services` | Service categories for an address | Noddi API |
| `get_available_items` | Sales items with prices | Noddi API |
| `get_delivery_windows` | Available time slots | Noddi API |
| `create_shopping_cart` | Create a new booking | Noddi API |

### 2.5 Post-Processor Pipeline

After the AI generates its final text response, a pipeline of post-processors transforms the output to ensure data integrity and UI consistency:

| Post-Processor | Purpose |
|----------------|---------|
| `patchBookingSummaryTime` | Normalizes all times in `[BOOKING_SUMMARY]` JSON to Oslo timezone (Europe/Oslo) |
| `patchBookingSummary` | Injects missing `user_id`, `user_group_id`, `delivery_window_id` from conversation context. Re-looks up customer if IDs are missing. Reconstructs JSON if AI emitted prose instead. |
| `patchTimeSlotConfirmToEdit` | After time slot selection, auto-generates `[BOOKING_EDIT]` marker with old/new values |
| `patchBookingEdit` | Validates `booking_id` against actual tool results. Replaces placeholder IDs. Ensures `delivery_window_id/start/end` are present. |
| `patchBookingConfirmed` | Injects real booking data (booking_number, details) into `[BOOKING_CONFIRMED]` cards from tool results |
| `patchBookingInfo` | Auto-wraps booking details into `[BOOKING_INFO]` cards when AI lists them as plain text |
| `patchGroupSelect` | Handles multi-group user selection by inserting `[GROUP_SELECT]` dropdown |
| `patchActionMenu` | Auto-injects `[ACTION_MENU]` with relevant options in booking context |
| `patchYesNo` | Wraps confirmation questions (detected via patterns like "Ønsker du...", "Er dette...") in `[YES_NO]` interactive buttons |

### 2.6 Conversation Persistence

| Table | Purpose |
|-------|---------|
| `widget_ai_conversations` | Conversation metadata (org, widget, visitor info, status, tools_used array) |
| `widget_ai_messages` | Individual messages (role, content, tools_used array per message) |

- Test mode (`test: true`) skips all persistence
- `updateConversationMeta` merges tool usage across messages

### 2.7 Knowledge Gap Detection

Triggered automatically when:
1. `search_knowledge_base` was called during the request
2. The request is NOT in test mode

The `detectKnowledgeGap` function:
- Checks for existing similar gaps (fuzzy match on first 60 chars)
- Increments frequency if found, creates new entry if not
- Stored in `knowledge_gaps` table with `status: 'open'`

### 2.8 Error Tracking

`saveErrorDetails` appends structured error events to the `error_details` JSON array on `widget_ai_conversations`. Tracked event types:

- `openai_error` — OpenAI API failures
- `tool_error` — Individual tool execution errors
- `loop_break` — Circuit breaker triggered
- `loop_exhaustion` — Max iterations reached
- `recovery_call_error` — Forced final response failed
- `fallback_sent` — True fallback message used

---

## 3. Interactive Component Registry

### 3.1 Architecture

**Registry file:** `src/widget/components/blocks/registry.ts`  
**Entry point:** `src/widget/components/blocks/index.ts`

The registry uses a **self-registration pattern**: each block file imports `registerBlock()` and calls it at module load time. The entry point (`index.ts`) imports all blocks to trigger registration.

```typescript
// registry.ts — Core types and registry
interface BlockDefinition {
  type: string;                                    // Unique block identifier
  marker: string;                                  // Opening marker (e.g., "[ACTION_MENU]")
  closingMarker?: string;                          // Closing marker (e.g., "[/ACTION_MENU]")
  parseContent: (inner: string) => Record<string, any>;  // Parser for content between markers
  component: React.FC<BlockComponentProps>;         // React component to render
  requiresApi?: boolean;                            // Whether block makes API calls
  apiConfig?: { endpoints: ApiEndpointConfig[] };   // API endpoint documentation
  flowMeta: {
    label: string;                                  // Display name in Flow Builder
    icon: string;                                   // Lucide icon name
    description: string;                            // Description for Flow Builder
    applicableFieldTypes?: string[];                // Maps to ActionFlow step field_type
    applicableNodeTypes?: string[];                 // Maps to FlowBuilder node types
    previewComponent?: React.FC<FlowPreviewProps>;  // Mini-preview for ComponentLibrary
  };
}

interface BlockComponentProps {
  primaryColor: string;            // Widget's primary color
  messageId: string;               // Parent message ID
  blockIndex: number;              // Index within message (for multiple blocks)
  usedBlocks: Set<string>;         // Set of already-used block keys (prevents double-click)
  onAction: (value: string, blockKey: string) => void;  // Callback when user interacts
  widgetKey?: string;              // Widget key (for API blocks)
  conversationId?: string | null;  // Conversation ID (for API blocks)
  language?: string;               // Language code
  onLogEvent?: (...) => void;      // Event logger for test mode
  data: Record<string, any>;       // Parsed content from parseContent()
}
```

### 3.2 Complete Block Reference

#### General-Purpose Blocks (no API required)

| Block | Marker | Description | Parsed Data |
|-------|--------|-------------|-------------|
| **ActionMenuBlock** | `[ACTION_MENU]...[/ACTION_MENU]` | Clickable pill buttons for choices | `{ options: string[] }` — one option per line |
| **PhoneVerifyBlock** | `[PHONE_VERIFY]` | Phone input + SMS OTP verification form | `{}` (no inner content) |
| **YesNoBlock** | `[YES_NO]...[/YES_NO]` | Binary choice with thumbs up/down buttons | `{ question: string }` |
| **EmailInputBlock** | `[EMAIL_INPUT]` | Validated email input field | `{}` |
| **TextInputBlock** | `[TEXT_INPUT]...[/TEXT_INPUT]` | Text input with placeholder | `{ placeholder: string }` |
| **RatingBlock** | `[RATING]` | 5-star rating selector | `{}` |
| **ConfirmBlock** | `[CONFIRM]...[/CONFIRM]` | Confirmation card with Confirm/Cancel buttons | `{ summary: string }` |
| **BookingConfirmedBlock** | `[BOOKING_CONFIRMED]...[/BOOKING_CONFIRMED]` | Read-only success card after booking creation | `{ booking_id, booking_number, service, address, car, date, time, price }` |
| **BookingInfoBlock** | `[BOOKING_INFO]...[/BOOKING_INFO]` | Read-only info card for existing booking details | `{ booking_id, address, date, time, service, car }` |
| **BookingSelectBlock** | `[BOOKING_SELECT]...[/BOOKING_SELECT]` | Booking selection dropdown for multi-booking users | `{ bookings: Array }` |
| **GroupSelectBlock** | `[GROUP_SELECT]...[/GROUP_SELECT]` | User group selector for multi-group customers | `{ groups: Array }` |

#### API-Calling Blocks (require `widgetKey` and `conversationId`)

| Block | Marker | Description | API Endpoint |
|-------|--------|-------------|-------------|
| **AddressSearchBlock** | `[ADDRESS_SEARCH]...[/ADDRESS_SEARCH]` | Interactive address picker with autocomplete | `noddi-address-lookup` edge function |
| **LicensePlateBlock** | `[LICENSE_PLATE]...[/LICENSE_PLATE]` | License plate input with vehicle lookup | `noddi-customer-lookup` edge function |
| **ServiceSelectBlock** | `[SERVICE_SELECT]...[/SERVICE_SELECT]` | Fetches and displays available services with prices | Noddi API via edge function |
| **TimeSlotBlock** | `[TIME_SLOT]...[/TIME_SLOT]` | Fetches and displays delivery time windows | Noddi API via edge function |
| **BookingSummaryBlock** | `[BOOKING_SUMMARY]...[/BOOKING_SUMMARY]` | Booking summary with confirm/cancel. Creates booking on confirm. | `noddi-booking-proxy` edge function |
| **BookingEditConfirmBlock** | `[BOOKING_EDIT]...[/BOOKING_EDIT]` | Diff-based review of booking modifications with confirm/cancel | `noddi-booking-proxy` edge function |

### 3.3 File Locations

All blocks are in `src/widget/components/blocks/`:

```
src/widget/components/blocks/
├── registry.ts              # Core types, registerBlock(), getBlock(), getAllBlocks()
├── index.ts                 # Imports all blocks (triggers registration), re-exports
├── ActionMenuBlock.tsx
├── AddressSearchBlock.tsx
├── BookingConfirmedBlock.tsx
├── BookingEditConfirmBlock.tsx
├── BookingInfoBlock.tsx
├── BookingSelectBlock.tsx
├── BookingSummaryBlock.tsx
├── ConfirmBlock.tsx
├── EmailInputBlock.tsx
├── GroupSelectBlock.tsx
├── LicensePlateBlock.tsx
├── PhoneVerifyBlock.tsx
├── RatingBlock.tsx
├── ServiceSelectBlock.tsx
├── TextInputBlock.tsx
├── TimeSlotBlock.tsx
└── YesNoBlock.tsx
```

### 3.4 How Block Parsing Works at Runtime

The widget's message renderer:
1. Scans each assistant message for markers using the registry
2. For each found marker, extracts inner content between opening and closing markers
3. Calls `parseContent(inner)` to produce structured `data`
4. Renders the block's React `component` with `BlockComponentProps`
5. Tracks used blocks via `usedBlocks` Set to prevent duplicate interactions

---

## 4. Action Flows System

Action Flows are admin-configured **intent-based micro-flows** that tell the AI how to handle specific customer requests (e.g., "new booking", "change time", "cancel booking").

### 4.1 Database Schema

**Table:** `ai_action_flows`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK → organizations |
| `widget_config_id` | UUID | FK → widget_configs (flow is widget-specific) |
| `intent_key` | string | Machine-readable intent (e.g., `new_booking`, `cancel_booking`) |
| `label` | string | Human-readable label (e.g., "Ny bestilling") |
| `description` | string | When this flow should activate |
| `trigger_phrases` | string[] | Example phrases that trigger this flow (e.g., `["bestille", "ny booking"]`) |
| `requires_verification` | boolean | Whether phone OTP is required before starting |
| `flow_steps` | JSON | Array of `FlowStep` objects defining the sequence |
| `is_active` | boolean | Whether this flow is enabled |
| `sort_order` | number | Display/processing order |

### 4.2 Flow Step Types

```typescript
interface FlowStep {
  id: string;
  type: 'collect' | 'confirm' | 'lookup' | 'display';
  field?: string;         // Field name (for collect steps)
  marker?: string;        // UI marker to emit (e.g., "ADDRESS_SEARCH")
  instruction: string;    // Natural language instruction for the AI
}
```

| Step Type | Purpose | Example |
|-----------|---------|---------|
| `collect` | Gather data from the customer using a UI block | "Collect the customer's address" → emits `[ADDRESS_SEARCH]` |
| `confirm` | Ask the customer to confirm an action | "Show booking summary for confirmation" → emits `[BOOKING_SUMMARY]` |
| `lookup` | Retrieve data using a tool | "Look up available services" → AI calls `list_available_services` |
| `display` | Show information to the customer | "Display booking details" → emits `[BOOKING_INFO]` |

### 4.3 How Flows Are Injected into the System Prompt

The `buildActionFlowsPrompt(flows, isVerified)` function generates a dynamic prompt section:

```
AVAILABLE ACTION FLOWS:
When the customer expresses intent matching one of these actions, follow the corresponding step-by-step flow.

--- Ny bestilling (intent: "new_booking") ---
When: Customer wants to book a new service
Example triggers: "bestille", "ny booking", "book time"
Steps:
  1. Collect address
     → [ADDRESS_SEARCH marker instructions]
  2. Collect car
     → [LICENSE_PLATE marker instructions]
  3. Select service
     → [SERVICE_SELECT marker instructions]
  ...
```

Each step's marker is mapped to detailed LLM instructions via the `BLOCK_PROMPTS` dictionary (defined at line ~1752 of `widget-ai-chat/index.ts`). This ensures the AI knows the exact syntax and rules for emitting each interactive component.

### 4.4 Admin UI — Simple Flows

**Component:** `ActionFlowsManager` (`src/components/admin/widget/ActionFlowsManager.tsx`, 379 lines)

Provides a card-based CRUD interface for managing linear action flows:
- Create/edit/delete flows
- Toggle active/inactive
- Add/remove/reorder steps
- Select step type and marker from dropdown
- Set trigger phrases and verification requirement

**Available markers in the UI:**
```
ADDRESS_SEARCH, LICENSE_PLATE, SERVICE_SELECT, TIME_SLOT,
BOOKING_SUMMARY, BOOKING_EDIT, PHONE_VERIFY, EMAIL_INPUT,
TEXT_INPUT, YES_NO, ACTION_MENU, RATING, CONFIRM
```

### 4.5 Admin UI — Advanced Flow Builder

**Component:** `AiFlowBuilder` (`src/components/admin/widget/AiFlowBuilder.tsx`, 1538 lines)

A visual tree-based flow builder for complex conversational logic with branching.

#### Node Types

| Node Type | Icon | Description |
|-----------|------|-------------|
| `message` | MessageSquare | Bot sends a message or instruction |
| `decision` | GitFork | IF/YES/NO branching logic |
| `action_menu` | ListChecks | Present choices as clickable buttons |
| `data_collection` | FileInput | Ask customer for input (phone, email, address, etc.) |
| `escalation` | PhoneForwarded | Hand off to a human agent |
| `goto` | CornerDownRight | Jump to another node in the tree |

#### Decision Node Modes

| Mode | Behavior |
|------|----------|
| `ask_customer` | Shows `[YES_NO]` buttons — customer chooses the branch |
| `auto_evaluate` | AI silently evaluates a condition (e.g., "Was phone verification successful?") and branches automatically. Admins can link to a specific prior field outcome via `auto_evaluate_source`. |

#### Flow Configuration Schema

```typescript
interface FlowConfig {
  nodes: FlowNode[];          // Root-level nodes (tree structure)
  general_rules: GeneralRules;
}

interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  instruction: string;
  conditions?: FlowCondition[];      // For decision nodes
  actions?: FlowAction[];            // For action_menu nodes
  data_fields?: DataField[];         // For data_collection nodes
  children?: FlowNode[];             // Child nodes (sequential)
  yes_children?: FlowNode[];         // Decision: true branch
  no_children?: FlowNode[];          // Decision: false branch
  goto_target?: string;              // For goto nodes
  decision_mode?: 'ask_customer' | 'auto_evaluate';
  auto_evaluate_source?: string;     // ID of prior field to evaluate
}
```

The tree is serialized to JSON and stored in `widget_configs.flow_config` (JSON column).

---

## 5. Knowledge Management System

### 5.1 Admin Page

**File:** `src/pages/KnowledgeManagement.tsx`

Six tabs:

| Tab | Component | Description |
|-----|-----------|-------------|
| Overview | `KnowledgeAnalytics` + `SuggestionPerformance` | Dashboard stats, auto-promote button |
| Entries | `KnowledgeEntriesManager` | CRUD with search, category filter, star ratings, tags |
| Import | `KnowledgeImportFromHistory` | Extraction jobs, pending review queue, bulk approve |
| Performance | `SuggestionPerformance` | Per-source performance metrics |
| System Health | `SystemHealthMonitor` | System health checks |
| Settings | `KnowledgeSettings` | `CategoryManager` + `TagManager` |

### 5.2 Core Concept: Knowledge Entries

A **knowledge entry** is a proven Q&A pair that the AI can use to answer customer questions:

```typescript
interface KnowledgeEntry {
  id: string;
  customer_context: string;      // The question / customer scenario
  agent_response: string;        // The proven good answer
  category: string | null;       // Category classification
  tags: string[] | null;         // Descriptive tags
  quality_score: number | null;  // 0-100 quality rating
  usage_count: number | null;    // Times this entry was used
  acceptance_count: number | null; // Times agent accepted this suggestion
  embedding: vector | null;      // pgvector embedding (1536 dimensions)
  is_active: boolean;            // Whether entry is active
  is_manually_curated: boolean;  // Manual vs auto-created
  created_from_message_id: string | null;  // Source message if auto-created
  organization_id: string;
}
```

### 5.3 Knowledge Entry Lifecycle

Entries can be created through four pathways:

```
┌─────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE ENTRY LIFECYCLE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. MANUAL CREATION                                             │
│     Admin → KnowledgeEntriesManager → Create Entry              │
│     ↓                                                           │
│     knowledge_entries (is_manually_curated = true)              │
│                                                                 │
│  2. IMPORT FROM CONVERSATION HISTORY                            │
│     Admin → KnowledgeImportFromHistory → Start Extraction       │
│     ↓                                                           │
│     extract-knowledge-from-history edge function                │
│     ↓                                                           │
│     knowledge_pending_entries (review_status = 'pending')       │
│     ↓                                                           │
│     Admin reviews → Approve/Reject                              │
│     ↓                                                           │
│     knowledge_entries (if approved)                              │
│                                                                 │
│  3. AUTO-PROMOTION FROM SUCCESSFUL RESPONSES                    │
│     Agent replies → response_tracking (positive feedback)       │
│     ↓                                                           │
│     auto-promote-responses edge function                        │
│     ↓                                                           │
│     knowledge_entries (quality_score meets threshold)            │
│                                                                 │
│  4. AUTO-LEARNING FROM WIDGET FEEDBACK                          │
│     Customer gives thumbs up in widget                          │
│     ↓                                                           │
│     widget-ai-feedback edge function                            │
│     ↓                                                           │
│     knowledge_entries (auto-created from positive feedback)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Semantic Search (RAG)

The AI uses **Retrieval-Augmented Generation** to find relevant knowledge entries:

1. **Embedding generation:** Customer question → OpenAI `text-embedding-3-small` → 1536-dim vector
2. **Similarity search:** `find_similar_responses` Supabase RPC (pgvector cosine similarity)
3. **Threshold:** 0.75 minimum similarity
4. **Max results:** 5 entries
5. **Result format:** Each result includes `customer_context`, `agent_response`, `category`, `similarity` score

```sql
-- find_similar_responses RPC (simplified)
SELECT customer_context, agent_response, category,
       1 - (embedding <=> query_embedding) as similarity
FROM knowledge_entries
WHERE organization_id = org_id
  AND is_active = true
  AND 1 - (embedding <=> query_embedding) > match_threshold
ORDER BY similarity DESC
LIMIT match_count;
```

### 5.5 Knowledge Database Tables

| Table | Purpose |
|-------|---------|
| `knowledge_entries` | Proven Q&A pairs with embeddings |
| `knowledge_pending_entries` | Staging table for review (from extraction or auto-promotion) |
| `knowledge_extraction_jobs` | Batch import job progress tracking |
| `knowledge_categories` | Category taxonomy (name, color, description) |
| `knowledge_tags` | Tag taxonomy (name, color, optional category association) |
| `knowledge_gaps` | Unanswered customer questions (auto-detected) |
| `knowledge_patterns` | Detected usage patterns |
| `response_tracking` | Agent reply metadata and feedback |
| `response_outcomes` | Conversation resolution results |

### 5.6 Knowledge Edge Functions

| Edge Function | Purpose | Inputs | Outputs |
|---------------|---------|--------|---------|
| `search-knowledge` | Semantic search endpoint | `{ query, organizationId }` | `{ results: [{ question, answer, similarity }] }` |
| `create-embedding` | Generate embedding for a single text | `{ text }` | `{ embedding: number[] }` |
| `batch-update-embeddings` | Bulk re-embed all entries for an org | `{ organizationId }` | `{ updated: number }` |
| `promote-response` | Manually promote a response to knowledge | `{ messageId, organizationId }` | `{ entryId }` |
| `auto-promote-responses` | Auto-promote high-quality responses | `{ organizationId }` | `{ promoted: number }` |
| `extract-knowledge-from-history` | Batch Q&A extraction from closed conversations | `{ organizationId }` | Creates `knowledge_pending_entries` |
| `refine-suggestion` | AI-powered response refinement | `{ suggestion, context }` | `{ refined: string }` |
| `suggest-replies` | Generate agent-facing suggestions | `{ conversationId }` | `{ suggestions: string[] }` |
| `track-outcome` | Track conversation resolution outcome | `{ conversationId, outcome }` | `{ success: boolean }` |
| `widget-ai-feedback` | Process widget thumbs up/down feedback | `{ messageId, rating }` | Auto-creates knowledge entry on positive |

### 5.7 Knowledge UI Components

| Component | File | Description |
|-----------|------|-------------|
| `KnowledgeEntriesManager` | `src/components/dashboard/knowledge/KnowledgeEntriesManager.tsx` | Full CRUD: search, category filter, star rating input, tag management, rich text editing |
| `KnowledgeImportFromHistory` | `src/components/dashboard/knowledge/KnowledgeImportFromHistory.tsx` | Start extraction jobs, view pending entries, approve/reject in bulk |
| `KnowledgeSettings` | `src/components/dashboard/knowledge/KnowledgeSettings.tsx` | Hosts `CategoryManager` + `TagManager` |
| `CategoryManager` | `src/components/dashboard/knowledge/CategoryManager.tsx` | CRUD for knowledge categories (name, color, description) |
| `TagManager` | `src/components/dashboard/knowledge/TagManager.tsx` | CRUD for knowledge tags (name, color, category association) |
| `TagMultiSelect` | `src/components/dashboard/knowledge/TagMultiSelect.tsx` | Reusable tag multi-select dropdown |
| `KnowledgeAnalytics` | `src/components/dashboard/KnowledgeAnalytics.tsx` | Dashboard stats, auto-promote trigger button |
| `SuggestionPerformance` | `src/components/dashboard/SuggestionPerformance.tsx` | Per-source performance metrics (AI, Knowledge, Template) |
| `SystemHealthMonitor` | `src/components/dashboard/SystemHealthMonitor.tsx` | System health checks and diagnostics |

---

## 6. Agent-Side Knowledge Features

These features help human agents in the inbox by surfacing AI-powered suggestions and tracking their usage.

| Feature | Location | Description |
|---------|----------|-------------|
| `useKnowledgeTracking` hook | `src/hooks/useKnowledgeTracking.ts` | Tracks when an agent uses a suggestion — records in `response_tracking` |
| `AIKnowledgeIndicator` | `src/components/dashboard/AIKnowledgeIndicator.tsx` | Badge showing response source: AI / Template / Knowledge Base |
| `AiSuggestionDialog` | `src/components/dashboard/AiSuggestionDialog.tsx` | Suggestion preview with AI-powered refinement workflow (calls `refine-suggestion`) |
| `KnowledgeQuickStats` | `src/components/dashboard/KnowledgeQuickStats.tsx` | Sidebar widget showing quick knowledge base stats |

---

## 7. AI Chatbot Admin Portal

**Entry point:** `src/components/admin/AiChatbotSettings.tsx`

### Layout

- **Left sidebar:** Widget selector — lists all configured widgets with active/inactive badges
- **Main content:** 7 tabs for the selected widget

### Tabs

| Tab | Component | File | Description |
|-----|-----------|------|-------------|
| Components | `ComponentLibrary` | `src/components/admin/widget/ComponentLibrary.tsx` | Browse/test all 17 registered blocks. Shows marker syntax, preview, and API config. Supports creating custom DB-stored blocks. |
| Action Flows | `ActionFlowsManager` | `src/components/admin/widget/ActionFlowsManager.tsx` | CRUD for intent-based linear flows (see [Section 4.4](#44-admin-ui--simple-flows)) |
| Test | `WidgetTestMode` | `src/components/admin/widget/WidgetTestMode.tsx` | Live widget simulation with session logging. Messages are sent to `widget-ai-chat` with `test: true`. |
| Conversations | `AiConversationHistory` | `src/components/admin/widget/AiConversationHistory.tsx` | Browse all AI conversations, view full transcripts, see tools used |
| Analytics | `AiAnalyticsDashboard` | `src/components/admin/widget/AiAnalyticsDashboard.tsx` | Conversation metrics: volume, resolution rate, avg messages, tool usage |
| Gaps | `KnowledgeGapDetection` | `src/components/admin/widget/KnowledgeGapDetection.tsx` | Unanswered question tracking, frequency-sorted, link to create knowledge entry |
| Error Traces | `AiErrorTraces` | `src/components/admin/widget/AiErrorTraces.tsx` | Loop exhaustion events, tool failures, fallback events. Reads from `error_details` JSON on conversations. |

---

## 8. Database Schema Reference

### AI Chatbot Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `widget_ai_conversations` | `id`, `organization_id`, `widget_config_id`, `visitor_phone`, `visitor_email`, `status`, `tools_used[]`, `error_details` (JSON), `feedback_rating` | Conversation sessions |
| `widget_ai_messages` | `id`, `conversation_id`, `role`, `content`, `tools_used[]`, `created_at` | Individual messages |
| `ai_action_flows` | `id`, `widget_config_id`, `intent_key`, `label`, `trigger_phrases[]`, `flow_steps` (JSON), `requires_verification`, `is_active`, `sort_order` | Intent-based action flows |
| `widget_configs` | `id`, `widget_key`, `organization_id`, `ai_general_config` (JSON), `flow_config` (JSON), `is_active` | Widget configuration including AI settings |

### Knowledge Management Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `knowledge_entries` | `id`, `customer_context`, `agent_response`, `embedding` (vector), `quality_score`, `category`, `tags[]`, `usage_count`, `acceptance_count`, `is_active` | Proven Q&A pairs |
| `knowledge_pending_entries` | `id`, `customer_context`, `agent_response`, `review_status`, `ai_quality_score`, `extraction_job_id`, `suggested_category_id`, `suggested_tags[]` | Staging for review |
| `knowledge_extraction_jobs` | `id`, `organization_id`, `status`, `total_conversations`, `total_processed`, `entries_created`, `entries_skipped` | Batch import progress |
| `knowledge_categories` | `id`, `name`, `color`, `description`, `organization_id`, `is_active` | Category taxonomy |
| `knowledge_tags` | `id`, `name`, `color`, `category_id`, `organization_id` | Tag taxonomy |
| `knowledge_gaps` | `id`, `question`, `frequency`, `status`, `conversation_id`, `resolved_by_entry_id`, `priority` | Unanswered questions |
| `knowledge_patterns` | `id`, `pattern_key`, `pattern_type`, `occurrence_count`, `success_rate`, `example_refinements[]` | Detected usage patterns |
| `response_tracking` | Tracks agent suggestion usage and feedback | Response metadata |
| `response_outcomes` | Tracks conversation resolution results | Outcome data |

### Key RPC Functions

| Function | Purpose |
|----------|---------|
| `find_similar_responses(query_embedding, org_id, match_threshold, match_count)` | pgvector cosine similarity search on `knowledge_entries` |
| `recalculate_quality_scores(org_id)` | Recalculate quality scores based on usage and feedback |
| `get_user_organization_id()` | Returns the authenticated user's organization ID |

---

## 9. Edge Functions Reference

### AI Chatbot Functions

| Function | Path | Method | Description |
|----------|------|--------|-------------|
| `widget-ai-chat` | `/functions/v1/widget-ai-chat` | POST | Main AI chatbot engine (see [Section 2](#2-ai-chatbot-engine-widget-ai-chat)) |
| `widget-ai-feedback` | `/functions/v1/widget-ai-feedback` | POST | Process widget feedback (thumbs up/down) |
| `widget-send-verification` | `/functions/v1/widget-send-verification` | POST | Send SMS OTP for phone verification |
| `widget-verify-phone` | `/functions/v1/widget-verify-phone` | POST | Verify SMS OTP code |

### Knowledge Management Functions

| Function | Path | Method | Description |
|----------|------|--------|-------------|
| `search-knowledge` | `/functions/v1/search-knowledge` | POST | Semantic search endpoint |
| `create-embedding` | `/functions/v1/create-embedding` | POST | Generate embedding for single text |
| `batch-update-embeddings` | `/functions/v1/batch-update-embeddings` | POST | Bulk re-embed all entries |
| `promote-response` | `/functions/v1/promote-response` | POST | Manual promotion to knowledge base |
| `auto-promote-responses` | `/functions/v1/auto-promote-responses` | POST | Automated quality-based promotion |
| `extract-knowledge-from-history` | `/functions/v1/extract-knowledge-from-history` | POST | Batch Q&A extraction from conversations |
| `refine-suggestion` | `/functions/v1/refine-suggestion` | POST | AI-powered response refinement |
| `suggest-replies` | `/functions/v1/suggest-replies` | POST | Agent-facing suggestion generation |
| `track-outcome` | `/functions/v1/track-outcome` | POST | Conversation outcome tracking |

### External API Proxy Functions

| Function | Path | Method | Description |
|----------|------|--------|-------------|
| `noddi-address-lookup` | `/functions/v1/noddi-address-lookup` | POST | Proxy for Noddi address autocomplete API |
| `noddi-customer-lookup` | `/functions/v1/noddi-customer-lookup` | POST | Proxy for Noddi customer search API |
| `noddi-booking-proxy` | `/functions/v1/noddi-booking-proxy` | POST | Proxy for Noddi booking CRUD operations |
| `noddi-search-by-name` | `/functions/v1/noddi-search-by-name` | POST | Search Noddi customers by name |

---

## 10. Adding New Features (Developer Guide)

### 10.1 Adding a New Interactive Block

1. **Create the block file** at `src/widget/components/blocks/MyNewBlock.tsx`:

```tsx
import React from 'react';
import { registerBlock, BlockComponentProps } from './registry';

const MyNewBlock: React.FC<BlockComponentProps> = ({ primaryColor, messageId, blockIndex, usedBlocks, onAction, data }) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);

  return (
    <div>
      {/* Your block UI */}
      <button disabled={isUsed} onClick={() => onAction('selected_value', blockKey)}>
        {data.label}
      </button>
    </div>
  );
};

// Optional: mini-preview for ComponentLibrary
const MyNewBlockPreview: React.FC = () => (
  <div className="text-[8px]">Preview</div>
);

registerBlock({
  type: 'my_new_block',
  marker: '[MY_NEW_BLOCK]',
  closingMarker: '[/MY_NEW_BLOCK]',
  parseContent: (inner) => {
    try { return JSON.parse(inner); } catch { return { label: inner }; }
  },
  component: MyNewBlock,
  requiresApi: false,
  flowMeta: {
    label: 'My New Block',
    icon: 'Star',
    description: 'Description for Flow Builder',
    applicableFieldTypes: ['my_field_type'],
    applicableNodeTypes: ['data_collection'],
    previewComponent: MyNewBlockPreview,
  },
});
```

2. **Register it** by adding to `src/widget/components/blocks/index.ts`:

```typescript
import './MyNewBlock';
```

3. **Add LLM instructions** to `BLOCK_PROMPTS` in `widget-ai-chat/index.ts`:

```typescript
MY_NEW_BLOCK: `Include the marker [MY_NEW_BLOCK]JSON data[/MY_NEW_BLOCK] in your response.`,
```

4. **Add to marker list** in `ActionFlowsManager.tsx`:

```typescript
const AVAILABLE_MARKERS = [
  // ... existing markers
  'MY_NEW_BLOCK',
];
```

5. **Deploy** the edge function and test via the Admin Portal's Test tab.

### 10.2 Adding a New OpenAI Tool

1. **Define the tool** in the `tools` array in `widget-ai-chat/index.ts` (~line 58):

```typescript
{
  type: 'function' as const,
  function: {
    name: 'my_new_tool',
    description: 'What this tool does and when to use it',
    parameters: {
      type: 'object',
      properties: { /* ... */ },
      required: ['param1'],
    },
  },
},
```

2. **Implement the executor** as an `async function executeMyNewTool(...)`:

```typescript
async function executeMyNewTool(args: any, organizationId: string): Promise<string> {
  // Implementation
  return JSON.stringify({ result: '...' });
}
```

3. **Register in `executeTool` switch** (~line 2048):

```typescript
case 'my_new_tool':
  return executeMyNewTool(args, organizationId);
```

4. **Add system prompt instructions** if the tool requires specific usage patterns.

5. **Update circuit breaker limits** if needed (default: max 3 calls per tool).

### 10.3 Adding a New Action Flow Step Type

1. Add to `STEP_TYPES` in `ActionFlowsManager.tsx`:

```typescript
const STEP_TYPES = [
  // ... existing
  { value: 'my_step', label: 'My New Step' },
];
```

2. Update `buildActionFlowsPrompt` in the edge function if the step type needs special handling.

### 10.4 Extending the Knowledge Base Pipeline

**To add a new knowledge ingestion source:**

1. Create an edge function (e.g., `supabase/functions/my-knowledge-source/index.ts`)
2. Insert entries into `knowledge_pending_entries` with `review_status: 'pending'`
3. Or insert directly into `knowledge_entries` if auto-approved
4. Call `create-embedding` edge function to generate the embedding
5. The entry will appear in `KnowledgeImportFromHistory` for review (if pending)

**To modify the quality score algorithm:**

1. Update the `recalculate_quality_scores` RPC function in Supabase
2. Factors typically include: `usage_count`, `acceptance_count`, `is_manually_curated`, feedback ratings

---

## Appendix: Key Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | `widget-ai-chat`, `create-embedding`, `suggest-replies`, `refine-suggestion` | OpenAI API access |
| `NODDI_API_BASE` | `widget-ai-chat` | Base URL for Noddi external API (default: `https://api.noddi.co`) |
| `SUPABASE_URL` | All edge functions | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | All edge functions | Supabase service role key for admin operations |
