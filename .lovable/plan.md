

# Build Knowledge Library from HelpScout Historical Conversations

## Overview

You have ~6,800 closed conversations with ~8,400 agent responses imported from HelpScout. This is valuable training data for your chatbot V1 demo. We'll create a system to:

1. **Extract Q&A pairs** from historical conversations
2. **Generate embeddings** for similarity search
3. **Let admins review and curate** before adding to knowledge base
4. **Optionally auto-categorize** using AI

## Data Available

| Source | Count | Description |
|--------|-------|-------------|
| Closed Conversations | 6,742 | Resolved customer interactions |
| Agent Messages | 8,434 | Agent replies to customers |
| Customer Messages | 8,396 | Customer questions/requests |

## Implementation Approach

### Phase 1: Knowledge Extraction Edge Function

Create `extract-knowledge-from-history` edge function that:

1. Queries closed conversations with customer message followed by agent reply
2. Pairs customer context with agent response
3. Filters out:
   - Very short responses (< 50 chars) - likely "ok" or "done"
   - Internal notes
   - Duplicate patterns
4. Generates embeddings for each pair
5. Stores as "pending review" knowledge entries

### Phase 2: Admin Review UI

Add a new tab to Knowledge Base settings: "Import from History"

```text
+----------------------------------------------------------+
| Import from History                                       |
+----------------------------------------------------------+
| [Start Extraction] | Progress: 0/6742 conversations      |
+----------------------------------------------------------+
|                                                           |
| Pending Review (847 entries)                              |
|                                                           |
| +------------------------------------------------------+ |
| | Customer: "Hvordan endrer jeg bookingen min?"        | |
| | Agent: "Du kan endre bookingen din ved å gå til..."  | |
| |                                                      | |
| | Category: [Booking & Scheduling v]                   | |
| | Quality: ⭐⭐⭐⭐⭐                                    | |
| |                                                      | |
| | [Approve & Add] [Skip] [Edit Before Adding]          | |
| +------------------------------------------------------+ |
|                                                           |
+----------------------------------------------------------+
```

### Phase 3: AI-Assisted Categorization (Optional)

When extracting, use AI to:
- Suggest a category based on content
- Suggest relevant tags
- Rate quality (confidence score)

This saves manual review time.

## Database Changes

Add new table for extraction jobs and pending entries:

```text
knowledge_extraction_jobs
+-------------------+
| id                |
| organization_id   |
| status            | running, completed, failed
| total_processed   |
| entries_created   |
| started_at        |
| completed_at      |
+-------------------+

knowledge_pending_entries
+-------------------+
| id                |
| organization_id   |
| customer_context  |
| agent_response    |
| source_conv_id    | FK to original conversation
| suggested_category|
| suggested_tags    |
| ai_quality_score  |
| status            | pending, approved, rejected
| created_at        |
+-------------------+
```

## Extraction Logic

The extraction query identifies good Q&A pairs:

```sql
SELECT 
  c.id as conversation_id,
  c.subject,
  m_customer.content as customer_message,
  m_agent.content as agent_response
FROM conversations c
JOIN messages m_customer ON m_customer.conversation_id = c.id 
  AND m_customer.sender_type = 'customer'
  AND m_customer.is_internal = false
JOIN messages m_agent ON m_agent.conversation_id = c.id 
  AND m_agent.sender_type = 'agent'
  AND m_agent.is_internal = false
  AND m_agent.created_at > m_customer.created_at
WHERE c.status = 'closed'
  AND c.organization_id = $org_id
  AND LENGTH(m_agent.content) > 50
ORDER BY m_agent.created_at ASC
```

For each conversation, we take the first customer message and the first substantial agent reply.

## Quality Filters

Automatically skip:

| Filter | Reason |
|--------|--------|
| Agent response < 50 chars | Likely "ok", "done", "thanks" |
| Response is internal note | Not customer-facing |
| Duplicate customer context | Already have similar entry |
| Contains only phone note | "snakket med kunde" type notes |

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/extract-knowledge-from-history/index.ts` | Batch extraction edge function |
| `src/components/dashboard/knowledge/KnowledgeImportFromHistory.tsx` | Admin UI for triggering and reviewing |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/AdminKnowledgeSettings.tsx` | Add new "Import" tab |
| Database | Add extraction_jobs and pending_entries tables |

## User Flow

### Starting Extraction

1. Admin navigates to Knowledge Base > Import from History
2. Clicks "Start Extraction"
3. System begins processing 6,800 conversations
4. Progress bar shows status
5. Estimated time: ~10-15 minutes (with embedding generation)

### Reviewing Entries

1. Pending entries appear in a review queue
2. Admin can:
   - **Approve** - Add directly to knowledge base
   - **Approve & Edit** - Modify before adding
   - **Skip** - Don't add this entry
   - **Bulk Approve** - Approve all entries with AI score > 4.0
3. Approved entries get embeddings and join the active knowledge base

### Chatbot Integration

Once entries are approved:
- `suggest-replies` function already uses them
- AI suggestions improve immediately
- Chatbot V1 can use the same `search-knowledge` function

## Chatbot V1 Demo Architecture

This knowledge base directly powers the chatbot:

```text
Customer Question
       |
       v
+------------------+
| search-knowledge | <-- Finds similar entries via embedding
+------------------+
       |
       v
+------------------+
| suggest-replies  | <-- Generates contextual response
+------------------+
       |
       v
AI-Powered Answer
```

The more curated entries you have, the better the chatbot responses.

## Estimated Results

From 6,800 closed conversations, you might get:

| Metric | Estimate |
|--------|----------|
| Raw Q&A pairs extracted | ~5,000 |
| After quality filtering | ~2,000-3,000 |
| High confidence (AI > 4.0) | ~1,000-1,500 |

Starting with 1,000+ curated entries is excellent for a V1 chatbot demo.

## Technical Details

### Embedding Generation

Each entry needs an embedding for similarity search. The extraction function will:
1. Combine customer_context + agent_response
2. Call OpenAI text-embedding-3-small
3. Store 1536-dimension vector

### Rate Limiting

OpenAI embedding calls are rate-limited. The function will:
- Process in batches of 50
- Use background processing (EdgeRuntime.waitUntil)
- Support resume if interrupted

### HTML Cleaning

HelpScout messages contain HTML. We'll:
1. Strip HTML tags for plain text storage
2. Preserve formatting for rich display
3. Remove email signatures and footers

## Summary

| Step | Description |
|------|-------------|
| 1 | Create database tables for extraction jobs and pending entries |
| 2 | Build extraction edge function with quality filtering |
| 3 | Create admin UI for review queue |
| 4 | Add bulk approve/reject functionality |
| 5 | Integrate with existing knowledge base |

This gives you a scalable way to bootstrap your chatbot's knowledge from real customer interactions, with human-in-the-loop curation to ensure quality.

