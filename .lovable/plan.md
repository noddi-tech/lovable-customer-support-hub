

# Learning Dashboard — New Tab in Knowledge Management

## What this does
Adds a 7th "Learning" tab to the Knowledge Management page showing the AI self-improvement flywheel performance: feedback signals, edit category distribution, evaluation score trends, and a review queue table.

## Files to create/change

### 1. New: `src/components/dashboard/knowledge/LearningDashboard.tsx`
Main component accepting `organizationId` prop, containing all 4 sections:

**Section 1 — Feedback Signal Overview (4 stat cards)**
- Uses `useQuery` to fetch from `widget_ai_feedback` (grouped by source), `widget_ai_messages` (role='assistant' count), `preference_pairs` (count), `conversation_evaluations` (avg composite_score)
- Compares last 7 days vs previous 7 days for trend arrows
- Uses the existing Card/CardHeader/CardContent pattern from `KnowledgeAnalytics.tsx`

**Section 2 — Edit Category Distribution (left half of 2-col grid)**
- `useQuery` fetching `preference_pairs` grouped by `edit_category`
- Recharts `BarChart` showing tone/factual/policy/completeness/format counts
- Title: "What agents correct most"

**Section 3 — Evaluation Score Trend (right half)**
- `useQuery` fetching `conversation_evaluations` last 30 days, grouped by date
- Recharts `LineChart` with daily avg `composite_score * 100`
- Reference line at 50%
- Title: "AI Quality Score Trend"

**Section 4 — Review Queue (full width)**
- Fetches via `supabase.functions.invoke('review-queue', { body: { action: 'list', organizationId, status } })`
- Filter dropdowns for reason and status (default: pending)
- Table with Priority (colored badge), Reason (icon badge), Details (truncated), Created (relative time), Actions (Review/Dismiss buttons)
- Dismiss calls the edge function with `action: 'update', status: 'dismissed'`
- Review calls with `status: 'reviewed'`

### 2. Edit: `src/pages/KnowledgeManagement.tsx`
- Change `grid-cols-6` to `grid-cols-7` on TabsList
- Add `GraduationCap` icon import from lucide-react
- Add new TabsTrigger for "Learning" tab
- Add new TabsContent rendering `<LearningDashboard organizationId={...} />`

## Technical details
- All Supabase queries use the authenticated client (RLS handles org filtering); `widget_ai_feedback`, `widget_ai_messages`, `preference_pairs`, `conversation_evaluations` are all in the generated types
- `review_queue` accessed only via the existing edge function
- React Query stale times: 60s for stats, 30s for review queue
- Recharts already in the project (used in `CallVolumeChart`, `AiAnalyticsDashboard`)
- No database migrations needed — all tables exist

