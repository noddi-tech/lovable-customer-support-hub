

# Customer Memory Admin View — New Tab in Knowledge Management

## What this does
Adds a 9th "Customer Profiles" tab to the Knowledge Management page showing the customer memory system: stats, a searchable profile browser with expandable memory details, and a recent extractions log.

## Files to create/change

### 1. New: `src/components/dashboard/knowledge/CustomerMemoryDashboard.tsx`

Single component with `organizationId` prop, containing 3 sections:

**Section 1 — Memory Stats Cards (4 cards)**
- Customers with Profiles: `COUNT(DISTINCT customer_identifier)` from `customer_summaries`
- Total Active Memories: count from `customer_memories` where `is_active = true`
- Memories by Type: grouped count by `memory_type` shown as small breakdown text
- Auto-Extractions (24h): count from `customer_memories` where `created_at > now() - 24h`
- React Query, 60s stale time

**Section 2 — Customer Profile Browser**
- Search input filtering `customer_identifier` via `.ilike()`
- Table columns: Customer (with identifier_type badge), Summary (truncated 120), Memories count, Conversations, Sentiment (icon+color), Last Seen (relative), First Seen (date)
- Expandable rows using Collapsible component (already in the project)
- Expanded view fetches `customer_memories` for that identifier, shows each as a card with type badge (vehicle=blue, fact=gray, preference=purple, issue=red, sentiment=amber), memory_text, confidence %, and a "Deactivate" button
- Deactivate: `UPDATE customer_memories SET is_active = false WHERE id = $id`, invalidate queries, toast confirmation
- Pagination: first 50 rows, ordered by `last_seen_at DESC`

**Section 3 — Recent Extractions Log**
- Last 20 `customer_memories` ordered by `created_at DESC`
- Compact list: Time (relative), Customer (truncated), Type (badge), Memory (80 chars), Confidence (color-coded percentage)

### 2. Edit: `src/pages/KnowledgeManagement.tsx`
- Import `CustomerMemoryDashboard` and `Users` icon from lucide-react
- Add "Customer Profiles" TabsTrigger and TabsContent between Autonomy and Settings tabs

## Technical details
- Both tables have `organization_id` directly — straightforward queries
- Memory count per customer: separate query or inline count via a subselect pattern (Supabase JS doesn't support subselects, so fetch summaries + group-count memories separately and merge client-side)
- `as any` cast on complex Supabase chains to avoid TS2589 (same pattern as LearningDashboard/AutonomyDashboard)
- No database migrations needed — all tables exist with RLS

