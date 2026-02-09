

# Phase Review and Quality Rating Enhancement

## Phase Status Review

### Phase 1: Core AI Chatbot -- COMPLETE
- Edge function `widget-ai-chat` with OpenAI tool-calling (knowledge search, customer lookup, booking details)
- Widget `AiChat.tsx` component with chat UI, phone prompt, escalation buttons
- Translations added, localStorage session persistence

### Phase 2: Streaming, Persistence, Booking Mods, Admin Test -- COMPLETE
- SSE streaming via `streamAiMessage` with word-by-word delivery
- Server-side persistence in `widget_ai_conversations` and `widget_ai_messages` tables
- Booking modification tools: `reschedule_booking`, `cancel_booking`
- Admin `WidgetTestMode` for live AI testing with session log

### Phase 3: Feedback, Auto-learning, Analytics -- COMPLETE
- Thumbs up/down feedback via `widget-ai-feedback` edge function and `AiFeedback` widget component
- Auto-learning: positive feedback creates `knowledge_pending_entries` for human review
- AI Analytics dashboard with resolution rates, satisfaction metrics, tool usage charts

### Phase 4: Knowledge Gaps, Conversation History, Advanced AI -- COMPLETE
- Knowledge gap detection: unanswered questions tracked in `knowledge_gaps` table
- AI conversation history browser with search, filtering, and full transcript view
- Enhanced system prompt with multi-turn context, proactive suggestions, smart escalation

All originally planned phases are complete. No remaining phases from the original plan.

---

## New Feature: Quality Rating Across All Review Surfaces

Currently, the `StarRatingInput` component and quality scoring exist only in the Knowledge Entries Manager (when editing an entry). The user wants to be able to rate entries **everywhere they review content** to improve AI response quality.

### Surfaces That Need Rating

1. **AI Conversation History** (admin widget tab) -- When reviewing AI conversation transcripts, admins should be able to rate individual AI messages. This feedback directly updates `widget_ai_messages.feedback_rating` and can adjust linked knowledge entry scores.

2. **Knowledge Import / Pending Review Queue** -- Currently shows read-only AI quality stars. Admins should be able to override the AI quality score with their own star rating before approving, so entries enter the knowledge base with a human-validated score.

3. **Knowledge Gaps** -- When reviewing a gap, admins should be able to rate how important/urgent it is (priority rating) so the most critical gaps surface first.

4. **Knowledge Entries List** -- Already has star rating in the edit dialog, but should also allow inline quick-rating without opening the full edit dialog.

### Implementation Plan

#### 1. AI Conversation History: Admin Rating on Messages

**File: `src/components/admin/widget/AiConversationHistory.tsx`**

- Add a thumbs up/down + star rating control next to each AI assistant message in the transcript view
- When an admin rates a message:
  - Update `widget_ai_messages.feedback_rating` in the database
  - Insert/update `widget_ai_feedback` with `source: 'admin'` to distinguish from widget user feedback
  - If rated positively and no knowledge entry exists, create a `knowledge_pending_entries` record (same auto-learning flow)
  - If rated negatively, flag any linked knowledge entry for review (decrease quality score)

#### 2. Knowledge Import Pending Review: Editable Quality Score

**File: `src/components/dashboard/knowledge/KnowledgeImportFromHistory.tsx`**

- Replace the read-only `renderQualityStars` with the interactive `StarRatingInput` component
- Store the admin's chosen score in local state per entry
- When approving, use the admin's score instead of the `ai_quality_score` as the entry's `quality_score`

#### 3. Knowledge Gaps: Priority Rating

**File: `src/components/admin/widget/KnowledgeGapDetection.tsx`**

- Add a small priority selector (1-5 stars or Low/Medium/High/Critical) to each gap
- Persist to a new `priority` column on `knowledge_gaps` table (integer 1-5)
- Sort gaps by priority first, then frequency

**Database migration:**
- Add `priority` column (integer, default null) to `knowledge_gaps`
- Add `admin_quality_score` column (numeric, default null) to `knowledge_pending_entries` to track admin overrides

#### 4. Knowledge Entries: Inline Quick Rating

**File: `src/components/dashboard/knowledge/KnowledgeEntriesManager.tsx`**

- Make the existing quality score display clickable/interactive using `StarRatingInput`
- On click, allow inline rating change that saves directly to the database
- No need to open the full edit dialog just to adjust quality

### Technical Details

#### Database Migration

```sql
-- Add priority to knowledge_gaps for admin triage
ALTER TABLE knowledge_gaps ADD COLUMN IF NOT EXISTS priority integer DEFAULT NULL;

-- Add admin_quality_score to pending entries for human override
ALTER TABLE knowledge_pending_entries 
  ADD COLUMN IF NOT EXISTS admin_quality_score numeric DEFAULT NULL;

-- Add source field to widget_ai_feedback to distinguish admin vs widget feedback
ALTER TABLE widget_ai_feedback 
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'widget';
```

#### Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/widget/AiConversationHistory.tsx` | Add admin rating controls to message transcript |
| `src/components/dashboard/knowledge/KnowledgeImportFromHistory.tsx` | Replace read-only stars with interactive `StarRatingInput` |
| `src/components/admin/widget/KnowledgeGapDetection.tsx` | Add priority rating per gap |
| `src/components/dashboard/knowledge/KnowledgeEntriesManager.tsx` | Add inline quick-rating without edit dialog |
| `supabase/migrations/` | New migration for schema changes |
| `src/integrations/supabase/types.ts` | Update generated types |

#### Quality Score Impact on AI Responses

The `find_similar_responses` RPC already factors `quality_score` into its ranking. By allowing admins to rate entries across all surfaces, higher-quality entries naturally surface more often in AI responses, creating a continuous improvement loop:

```text
Admin rates content
       |
       v
quality_score updated
       |
       v
find_similar_responses ranks higher
       |
       v
AI serves better answers
       |
       v
Widget users give thumbs up
       |
       v
Score reinforced further
```

