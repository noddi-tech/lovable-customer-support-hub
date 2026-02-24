

## Create Comprehensive AI & Intelligence README

Create a detailed `docs/AI_INTELLIGENCE_README.md` file documenting the entire AI & Intelligence system, covering the AI Chatbot, Knowledge Management, Action Flows, Component Registry, and all supporting infrastructure.

### File to create

**`docs/AI_INTELLIGENCE_README.md`** -- a single comprehensive markdown document (~600-800 lines)

### Document structure

**1. Overview and Architecture**
- High-level description of the "Knowledge-First + Intent-Triggered Action Flows" model
- ASCII diagram showing the data flow: Widget -> `widget-ai-chat` edge function -> OpenAI (with tools) -> post-processors -> streamed response
- The two operational modes: General Conversation (knowledge base / RAG) and Action Flows (structured business operations)

**2. AI Chatbot (`widget-ai-chat` Edge Function)**
- Location: `supabase/functions/widget-ai-chat/index.ts` (~2675 lines)
- Request/response contract (`RequestBody` interface, SSE streaming)
- Rate limiting (per-widget, 20 req/min)
- System prompt construction (`buildSystemPrompt`) incorporating:
  - Language behavior
  - Verification status (verified vs unverified modes)
  - Action flow instructions (dynamically built from DB)
  - General config from `widget_configs.ai_general_config`
- OpenAI tool-calling loop:
  - 11 registered tools: `search_knowledge_base`, `lookup_customer`, `get_booking_details`, `reschedule_booking`, `cancel_booking`, `update_booking`, `lookup_car_by_plate`, `list_available_services`, `get_available_items`, `get_delivery_windows`, `create_shopping_cart`
  - 8-iteration max loop with circuit breakers (3 calls per tool, 2 for `get_delivery_windows`)
  - Tool response padding for broken loops
  - Forced final response with `tool_choice: "none"`
- Post-processors pipeline (executed in order):
  - `patchBookingSummaryTime` -- normalizes times to Oslo timezone
  - `patchBookingSummary` -- injects `user_id`, `user_group_id`, `delivery_window_id`
  - `patchTimeSlotConfirmToEdit` -- auto-creates `[BOOKING_EDIT]` after time slot selection
  - `patchBookingEdit` -- validates booking IDs from tool results
  - `patchBookingConfirmed` -- injects real booking data into confirmation cards
  - `patchBookingInfo` -- auto-wraps booking details into `[BOOKING_INFO]` cards
  - `patchGroupSelect` -- handles multi-group user selection
  - `patchActionMenu` -- auto-injects action menus in booking context
  - `patchYesNo` -- wraps confirmation questions in interactive buttons
- Conversation persistence: `widget_ai_conversations`, `widget_ai_messages`
- Knowledge gap detection: auto-logged when `search_knowledge_base` returns no results
- Error tracking: `saveErrorDetails` appends to `error_details` JSON array

**3. Interactive Component Registry**
- Architecture: `src/widget/components/blocks/registry.ts`
- Self-registration pattern: each block file calls `registerBlock()` on import
- Entry point: `src/widget/components/blocks/index.ts` imports all blocks
- `BlockDefinition` interface: `type`, `marker`, `closingMarker`, `parseContent`, `component`, `requiresApi`, `apiConfig`, `flowMeta`
- Complete list of 17 registered blocks with their markers:
  - `ActionMenuBlock` -- `[ACTION_MENU]...[/ACTION_MENU]`
  - `PhoneVerifyBlock` -- `[PHONE_VERIFY]`
  - `YesNoBlock` -- `[YES_NO]...[/YES_NO]`
  - `EmailInputBlock` -- `[EMAIL_INPUT]`
  - `TextInputBlock` -- `[TEXT_INPUT]...[/TEXT_INPUT]`
  - `RatingBlock` -- `[RATING]`
  - `ConfirmBlock` -- `[CONFIRM]...[/CONFIRM]`
  - `AddressSearchBlock` -- `[ADDRESS_SEARCH]...[/ADDRESS_SEARCH]` (requires API)
  - `LicensePlateBlock` -- `[LICENSE_PLATE]...[/LICENSE_PLATE]` (requires API)
  - `ServiceSelectBlock` -- `[SERVICE_SELECT]...[/SERVICE_SELECT]` (requires API)
  - `TimeSlotBlock` -- `[TIME_SLOT]...[/TIME_SLOT]` (requires API)
  - `BookingSummaryBlock` -- `[BOOKING_SUMMARY]...[/BOOKING_SUMMARY]` (requires API)
  - `BookingEditConfirmBlock` -- `[BOOKING_EDIT]...[/BOOKING_EDIT]` (requires API)
  - `BookingConfirmedBlock` -- `[BOOKING_CONFIRMED]...[/BOOKING_CONFIRMED]`
  - `BookingInfoBlock` -- `[BOOKING_INFO]...[/BOOKING_INFO]`
  - `BookingSelectBlock` -- `[BOOKING_SELECT]...[/BOOKING_SELECT]`
  - `GroupSelectBlock` -- `[GROUP_SELECT]...[/GROUP_SELECT]`
- How to add a new block (step-by-step guide)
- `flowMeta.applicableFieldTypes` / `applicableNodeTypes` for Flow Builder integration

**4. Action Flows System**
- Database table: `ai_action_flows`
- Schema: `intent_key`, `label`, `trigger_phrases`, `requires_verification`, `flow_steps`, `is_active`, `sort_order`
- Flow step types: `collect`, `confirm`, `lookup`, `display`
- How flows are injected into the system prompt via `buildActionFlowsPrompt()`
- `BLOCK_PROMPTS` mapping: marker-specific LLM instructions
- Admin UI components:
  - `ActionFlowsManager` (`src/components/admin/widget/ActionFlowsManager.tsx`) -- CRUD for simple step-based flows
  - `AiFlowBuilder` (`src/components/admin/widget/AiFlowBuilder.tsx`) -- advanced visual tree builder with node types: `message`, `decision`, `action_menu`, `data_collection`, `escalation`, `goto`
- Decision nodes: `ask_customer` vs `auto_evaluate` modes
- General rules configuration: `tone`, `max_initial_lines`, `never_dump_history`, `language_behavior`, `escalation_threshold`
- How the AI flow builder tree is serialized to JSON and stored in `flow_config` column

**5. Knowledge Management System**
- Admin page: `src/pages/KnowledgeManagement.tsx` with 6 tabs
- Core database tables:
  - `knowledge_entries` -- proven Q&A pairs with embeddings, quality scores, categories, tags
  - `response_tracking` -- agent reply metadata and feedback
  - `response_outcomes` -- conversation resolution results
  - `knowledge_pending_entries` -- staging table for review
  - `knowledge_extraction_jobs` -- batch import progress
  - `knowledge_categories` and `knowledge_tags` -- taxonomy
  - `knowledge_gaps` -- unanswered questions
- Knowledge entry lifecycle:
  1. Manual creation via `KnowledgeEntriesManager`
  2. Import from conversation history via `extract-knowledge-from-history` edge function
  3. Auto-promotion from successful responses via `auto-promote-responses`
  4. Auto-learning from positive widget feedback via `widget-ai-feedback`
- Semantic search via `find_similar_responses` RPC (pgvector cosine similarity)
- Embeddings: OpenAI `text-embedding-3-small` model
- Quality score formula and factors
- Edge functions:
  - `search-knowledge` -- semantic search endpoint
  - `create-embedding` -- single text embedding
  - `batch-update-embeddings` -- bulk re-embedding
  - `promote-response` -- manual promotion
  - `auto-promote-responses` -- automated quality-based promotion
  - `extract-knowledge-from-history` -- batch Q&A extraction from closed conversations
  - `refine-suggestion` -- AI-powered response refinement
  - `suggest-replies` -- agent-facing suggestion generation
  - `track-outcome` -- conversation outcome tracking
- UI components:
  - `KnowledgeEntriesManager` -- CRUD with search, category filter, star ratings, tags
  - `KnowledgeImportFromHistory` -- extraction jobs, pending review queue, bulk approve
  - `KnowledgeSettings` -- `CategoryManager` + `TagManager`
  - `KnowledgeAnalytics` -- dashboard stats, auto-promote button
  - `SuggestionPerformance` -- per-source performance metrics
  - `SystemHealthMonitor` -- system health checks
  - `KnowledgeQuickStats` -- sidebar widget

**6. Agent-Side Knowledge Features**
- `useKnowledgeTracking` hook -- tracks suggestion usage in `response_tracking`
- `AIKnowledgeIndicator` -- badge showing response source (AI / Template / Knowledge Base)
- `AiSuggestionDialog` -- suggestion preview with refinement workflow

**7. AI Chatbot Admin Portal**
- Entry point: `src/components/admin/AiChatbotSettings.tsx`
- Widget selector sidebar
- 7 tabs:
  - Components (`ComponentLibrary`) -- browse/test all registered blocks + create custom DB blocks
  - Action Flows (`ActionFlowsManager`) -- manage intent-based flows
  - Test (`WidgetTestMode`) -- live widget simulation
  - Conversations (`AiConversationHistory`) -- transcript monitoring
  - Analytics (`AiAnalyticsDashboard`) -- conversation metrics
  - Knowledge Gaps (`KnowledgeGapDetection`) -- unanswered question tracking
  - Error Traces (`AiErrorTraces`) -- loop exhaustion, tool failures, fallback events

**8. Database Schema Reference**
- Table-by-table listing of all AI-related tables with key columns
- RPC functions: `find_similar_responses`, `recalculate_quality_scores`, `get_user_organization_id`

**9. Edge Functions Reference**
- Complete table of all AI-related edge functions with purpose, inputs, and outputs

**10. Adding New Features (Developer Guide)**
- How to add a new interactive block
- How to add a new OpenAI tool
- How to add a new action flow step type
- How to extend the knowledge base pipeline

### Technical approach

- Single new file: `docs/AI_INTELLIGENCE_README.md`
- No code changes required
- Will reference exact file paths throughout for easy navigation
- Will include ASCII diagrams for architecture visualization
- Structured with clear heading hierarchy for both human and LLM consumption

