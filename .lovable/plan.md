

# Autonomy Dashboard — New Tab in Knowledge Management

## What this does
Adds an 8th "Autonomy" tab to the Knowledge Management page showing the confidence-gated autonomy system: topic levels, confidence distribution, and guardrail triggers.

## Files to create/change

### 1. New: `src/components/dashboard/knowledge/AutonomyDashboard.tsx`

Main component accepting `organizationId` prop, with 4 sections:

**Section 1 — System Status Cards (3 cards)**
- Topics Tracked: count from `topic_autonomy_levels`
- Highest Level: MAX `current_level`, mapped to name (Suggest/Draft & Queue/Auto-Send/Full Auto)
- Avg Confidence: average `confidence_score` from `widget_ai_messages` joined through `widget_ai_conversations` (since `widget_ai_messages` has no `organization_id` column — must join via `conversation_id` → `widget_ai_conversations.organization_id`)

**Section 2 — Topic Autonomy Levels Table**
- Fetches all `topic_autonomy_levels` rows for the org
- Columns: Topic (formatted intent_category), Level (colored badge), Responses, Acceptance Rate (color-coded), Avg Confidence, Eval Score, Last Evaluated (relative time), Max Level (dropdown)
- Max Level dropdown updates `override_max_level` directly via Supabase update with toast confirmation

**Section 3 — Confidence Score Distribution (left half)**
- Recharts BarChart histogram of confidence_score buckets (0.0–1.0 in 0.1 steps)
- Bars colored by range: red (0–0.4), amber (0.4–0.6), blue (0.6–0.75), green (0.75–1.0)
- Vertical dashed reference lines at 0.60, 0.75, 0.90 thresholds
- Data: query `widget_ai_messages` joined through `widget_ai_conversations` for org filtering

**Section 4 — Guardrail Trigger Log (right half)**
- Last 20 messages where `confidence_score = 0` and `confidence_breakdown->>'forced_review' = 'true'`
- Shows time, user message preview (80 chars), guardrail type
- Note: the LEFT JOIN for previous user message is complex for the Supabase JS client — will use a simpler approach: fetch the forced-review messages, then for each, fetch the preceding user message in the same conversation

### 2. Edit: `src/pages/KnowledgeManagement.tsx`
- Import `AutonomyDashboard` and `Shield` icon from lucide-react
- Add "Autonomy" TabsTrigger and TabsContent

## Technical details
- `widget_ai_messages` has NO `organization_id` column — all org-scoped queries must join through `widget_ai_conversations`
- For the confidence histogram, use `.select('confidence_score, conversation_id, widget_ai_conversations!inner(organization_id)')` pattern or cast to `any` to avoid deep type instantiation errors (same approach as LearningDashboard)
- `topic_autonomy_levels` has `organization_id` directly — straightforward queries
- `override_max_level` update uses direct Supabase `.update()` — RLS handles auth
- React Query with 60s stale time for stats, 30s for the guardrail log
- No database migrations needed

