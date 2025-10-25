# Knowledge System Testing Guide

## Quick Validation Test (5 minutes)

This test validates the complete knowledge system flow from start to finish.

### Prerequisites
- Admin access to the system
- At least one test conversation with a customer message

### Step 1: Generate AI Suggestions (2 min)
1. Open any conversation with a customer message
2. Click the "AI Suggestions" button in the reply area
3. **Expected**: 3-5 suggestions appear within 3 seconds
4. **Check**: Suggestions are contextually relevant to customer message
5. **Note**: First time will be slower as knowledge base is empty

### Step 2: Use and Track Suggestion (1 min)
1. Click on any suggestion to insert it into reply box
2. **Expected**: Reply text populates, tracking indicator shows active
3. Send the reply
4. **Expected**: 
   - Reply sends successfully
   - Feedback rating component appears
   - Tracking indicator clears

### Step 3: Submit Feedback (1 min)
1. Rate the suggestion (1-5 stars)
2. Optionally add a comment
3. Click "Submit Feedback"
4. **Expected**: 
   - Success toast appears
   - Feedback component dismisses
   - Can verify in database: response_tracking has feedback_rating

### Step 4: Verify Tracking (1 min)
1. Check database tables:
   ```sql
   SELECT * FROM response_tracking 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
2. **Expected**: Record exists with:
   - `response_source` = 'ai_suggestion'
   - `feedback_rating` = your rating
   - `agent_response` = the text you sent
   - `customer_message` = the original message

## Full System Test (30 minutes)

### Part 1: Response Tracking (10 min)

**Test Case 1.1: AI Suggestion Tracking**
1. Generate and use AI suggestion
2. Verify response_tracking created
3. Check response_source = 'ai_suggestion'
4. Verify message_id links correctly

**Test Case 1.2: Template Tracking**
1. Select and use a response template
2. Verify response_tracking created
3. Check response_source = 'template'
4. Verify template ID captured

**Test Case 1.3: Manual Reply Tracking**
1. Type a reply manually (don't use AI or template)
2. Verify response_tracking created
3. Check response_source = 'manual'

**Test Case 1.4: Feedback Submission**
1. Use AI suggestion and send
2. Rate with 5 stars and comment "Very helpful"
3. Verify feedback_rating and feedback_comment saved
4. Check feedback_submitted_at timestamp

### Part 2: Outcome Tracking (10 min)

**Test Case 2.1: Customer Reply Tracking**
1. Send agent response to customer
2. Simulate customer reply (or wait for real reply)
3. Verify track-outcome edge function triggers
4. Check response_outcomes table for new record
5. Verify reply_time_seconds calculated correctly

**Test Case 2.2: Satisfaction Scoring**
1. Have customer reply with positive keywords ("thanks", "perfect")
2. Check customer_satisfaction_score is high (4-5)
3. Have customer reply with negative keywords ("still broken")
4. Check customer_satisfaction_score is low (1-2)

**Test Case 2.3: Resolution Detection**
1. Customer replies with resolution keywords
2. Check conversation_resolved = true
3. Customer replies with follow-up question
4. Check conversation_resolved = false

### Part 3: Knowledge Base & Auto-Promotion (10 min)

**Test Case 3.1: Knowledge Base Search**
1. Create a knowledge_entry manually in database
2. Set quality_score = 4.5, usage_count = 5
3. Generate AI suggestions for similar customer message
4. Verify knowledge base entry appears in context
5. Check suggestion reflects proven response

**Test Case 3.2: Auto-Promotion Eligibility**
1. Use same AI suggestion 3+ times
2. Rate each with 4+ stars
3. Ensure customers reply positively
4. Run auto-promote-responses edge function manually
5. Verify new knowledge_entry created
6. Check quality_score calculated correctly

**Test Case 3.3: Quality Score Calculation**
1. Find response_tracking with multiple outcomes
2. Calculate expected quality score manually
3. Trigger auto-promotion
4. Verify knowledge_entry quality_score matches calculation

## Admin Portal Tests (15 min)

### Knowledge Management Page

**Test Case 4.1: Overview Tab**
1. Navigate to /admin/knowledge
2. Verify all stat cards show correct data
3. Check response source distribution
4. Verify avg quality score calculated correctly

**Test Case 4.2: Entries Tab**
1. View all knowledge entries
2. Search for specific text
3. Filter by category
4. Edit an entry (change customer_context or agent_response)
5. Save and verify update
6. Delete an entry and confirm deletion

**Test Case 4.3: Performance Tab**
1. View suggestion performance metrics
2. Verify charts render correctly
3. Check AI vs template vs knowledge base stats
4. Verify daily usage trend

**Test Case 4.4: System Health Tab**
1. View system health metrics
2. Click "Update Embeddings" button
3. Verify batch job runs successfully
4. Click "Download Report" button
5. Verify JSON file downloads
6. Check scheduled jobs display correctly

## Edge Function Tests (20 min)

### Test suggest-replies
```bash
curl -X POST https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/suggest-replies \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "customerMessage": "How do I reset my password?",
    "organizationId": "[ORG_ID]"
  }'
```

**Expected Response**:
```json
{
  "suggestions": [
    {
      "title": "Password Reset Steps",
      "reply": "I can help you reset your password...",
      "confidence": 0.9
    }
  ]
}
```

### Test track-outcome
```bash
curl -X POST https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/track-outcome \
  -H "Authorization: Bearer [SERVICE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "[CONV_ID]",
    "messageId": "[MSG_ID]"
  }'
```

**Expected**: Returns outcome metrics, creates response_outcomes record

### Test auto-promote-responses
```bash
curl -X POST https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/auto-promote-responses \
  -H "Authorization: Bearer [SERVICE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "[ORG_ID]",
    "minQualityScore": 4.0
  }'
```

**Expected**: Returns count of promoted responses

### Test submit-feedback
```bash
curl -X POST https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/submit-feedback \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "[MSG_ID]",
    "rating": 5,
    "comment": "Very helpful suggestion"
  }'
```

**Expected**: Updates response_tracking, returns success

## Performance Tests (15 min)

### Test Case 5.1: Vector Search Performance
1. Add 100+ knowledge entries
2. Measure find_similar_responses execution time
3. **Expected**: < 500ms for typical query
4. Check EXPLAIN ANALYZE output

### Test Case 5.2: AI Suggestion Generation
1. Time full suggest-replies flow
2. **Expected**: < 3s total (embedding + search + generation)
3. Test with and without knowledge base hits

### Test Case 5.3: Batch Operations
1. Trigger batch-update-embeddings with 100+ entries
2. Monitor progress and completion time
3. **Expected**: ~1 entry per second
4. Verify no errors in logs

### Test Case 5.4: Analytics Report Generation
1. Generate report for 30-day period
2. **Expected**: < 10s even with 1000+ tracking records
3. Verify all sections included
4. Check data accuracy

## Regression Tests (10 min)

Run these tests after any system changes:

1. **Basic Flow Still Works**
   - [ ] Can generate AI suggestions
   - [ ] Can use and send suggestion
   - [ ] Tracking record created
   - [ ] Feedback can be submitted

2. **Data Integrity**
   - [ ] No orphaned tracking records
   - [ ] All foreign keys valid
   - [ ] Quality scores within 0-5 range
   - [ ] Timestamps are correct

3. **UI Rendering**
   - [ ] Feedback component displays
   - [ ] Knowledge management page loads
   - [ ] Charts render correctly
   - [ ] No console errors

## Troubleshooting Common Test Failures

### "AI suggestions are empty"
- Check OPENAI_API_KEY is set
- Verify edge function deployed
- Check customer message is not empty
- Review edge function logs

### "Tracking record not created"
- Verify user is authenticated
- Check organization_id is set on user
- Review RLS policies
- Check for database errors in logs

### "Knowledge base not being used"
- Ensure knowledge_entries exist
- Verify embeddings are not null
- Check match_threshold (may be too restrictive)
- Review find_similar_responses function

### "Auto-promotion not working"
- Check if cron job is enabled (pg_cron)
- Verify quality score calculation
- Ensure usage_count >= 3
- Review auto-promote-responses logs

### "Quality scores incorrect"
- Check outcome records exist
- Verify quality calculation formula
- Review feedback ratings
- Check for division by zero issues

## Test Data Setup

### Minimal Test Dataset

```sql
-- Create test knowledge entry
INSERT INTO knowledge_entries (
  organization_id,
  customer_context,
  agent_response,
  quality_score,
  usage_count,
  acceptance_count,
  embedding
) VALUES (
  '[YOUR_ORG_ID]',
  'How do I reset my password?',
  'You can reset your password by clicking "Forgot Password" on the login page. You''ll receive an email with reset instructions.',
  4.5,
  10,
  9,
  '[EMBEDDING_VECTOR]'
);

-- Create test response tracking
INSERT INTO response_tracking (
  organization_id,
  conversation_id,
  message_id,
  agent_id,
  response_source,
  customer_message,
  agent_response,
  feedback_rating
) VALUES (
  '[YOUR_ORG_ID]',
  '[CONV_ID]',
  '[MSG_ID]',
  '[AGENT_ID]',
  'ai_suggestion',
  'I need to reset my password',
  'You can reset your password by clicking "Forgot Password"...',
  5
);
```

## Automated Test Scripts

### Run All Tests
```bash
# Run from project root
npm run test:knowledge-system
```

### Individual Test Suites
```bash
npm run test:tracking
npm run test:outcomes
npm run test:promotion
npm run test:admin
```

## Monitoring During Testing

Watch these logs in real-time:

```sql
-- Recent tracking records
SELECT * FROM response_tracking 
ORDER BY created_at DESC 
LIMIT 10;

-- Recent outcomes
SELECT * FROM response_outcomes 
ORDER BY created_at DESC 
LIMIT 10;

-- Knowledge entries by quality
SELECT 
  quality_score,
  COUNT(*) as count,
  AVG(usage_count) as avg_usage
FROM knowledge_entries
GROUP BY quality_score
ORDER BY quality_score DESC;
```

## Success Criteria

All tests pass when:

- [x] AI suggestions generate within 3 seconds
- [x] Response tracking captures all replies
- [x] Feedback updates quality scores correctly
- [x] Outcomes track customer satisfaction
- [x] Auto-promotion creates valid knowledge entries
- [x] Admin portal displays accurate metrics
- [x] Vector search returns relevant results
- [x] No console errors or warnings
- [x] All database constraints satisfied
- [x] Performance within acceptable thresholds
