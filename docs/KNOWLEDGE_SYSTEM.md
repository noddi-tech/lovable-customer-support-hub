# Knowledge Management System - Implementation Guide

## Overview

This document describes the complete AI-powered knowledge management system that learns from agent interactions and continuously improves response suggestions.

## Architecture

### Database Schema

#### Core Tables

1. **knowledge_entries** - Stores proven responses that can be reused
   - `customer_context`: The customer's question/message
   - `agent_response`: The agent's proven response
   - `quality_score`: Calculated quality rating (0-5)
   - `usage_count`: Number of times used
   - `acceptance_count`: Number of times accepted by agents
   - `embedding`: Vector embedding for similarity search

2. **response_tracking** - Tracks all agent replies
   - Links to message_id and conversation_id
   - Tracks response source (ai_suggestion, template, knowledge_base)
   - Stores feedback ratings and comments
   - Links to knowledge_entry_id if from knowledge base

3. **response_outcomes** - Tracks conversation outcomes
   - Links to response_tracking records
   - Tracks resolution status, reply time, satisfaction scores
   - Used to calculate quality scores

### Edge Functions

#### 1. suggest-replies
**Purpose**: Generate AI-powered reply suggestions

**How it works**:
1. Receives customer message
2. Creates embedding of customer message
3. Searches knowledge_entries for similar past responses
4. Passes proven responses as context to GPT-4o-mini
5. Returns 3-5 tailored suggestions

**Key features**:
- Uses `find_similar_responses()` SQL function
- Includes quality scores and usage counts in context
- Falls back to pure AI if no knowledge base matches

#### 2. track-outcome
**Purpose**: Automatically track conversation outcomes

**Triggered**: When a new customer message arrives after agent response

**Tracks**:
- Customer reply time
- Sentiment analysis (satisfaction score)
- Resolution status (keywords: "thanks", "solved", "perfect")
- Whether customer replied

#### 3. auto-promote-responses
**Purpose**: Promote high-quality responses to knowledge base

**Criteria**:
- Quality score >= 4.0 (configurable)
- Used at least 3 times
- Not already promoted
- Has positive feedback

**Process**:
1. Queries response_tracking records
2. Calculates quality score from outcomes
3. Generates embedding
4. Creates knowledge_entry
5. Links back to response_tracking

#### 4. batch-update-embeddings
**Purpose**: Regenerate embeddings for existing entries

**Use cases**:
- After changing embedding model
- Fixing corrupted embeddings
- Migrating data

#### 5. generate-analytics-report
**Purpose**: Generate comprehensive analytics report

**Includes**:
- Entry statistics by category
- Quality metrics
- Usage patterns
- Performance trends

#### 6. submit-feedback
**Purpose**: Record agent feedback on suggestions

**Process**:
1. Updates response_tracking with rating/comment
2. Triggers quality recalculation via database trigger
3. Adjusts knowledge_entry quality_score

### Database Functions

#### find_similar_responses()
- Uses vector similarity search (cosine distance)
- Returns top N most similar proven responses
- Filters by organization and quality threshold
- Orders by similarity and quality score

#### update_knowledge_quality_from_feedback()
- Database trigger that fires on feedback submission
- Recalculates quality_score for linked knowledge_entry
- Considers: feedback ratings, resolution rate, usage count

#### recalculate_knowledge_quality()
- Scheduled job (weekly)
- Recalculates quality scores for all entries
- Factors in recent outcomes and feedback

#### cleanup_old_tracking_data()
- Scheduled job (monthly)
- Archives tracking data older than 90 days
- Preserves aggregated statistics

### Scheduled Jobs (pg_cron)

1. **auto-promote-quality-responses**
   - Runs: Daily at 2:00 AM UTC
   - Promotes high-quality responses automatically

2. **recalculate-knowledge-quality**
   - Runs: Weekly on Sunday at 3:00 AM UTC
   - Updates all quality scores based on recent data

3. **cleanup-old-tracking-data**
   - Runs: Monthly on 1st at 4:00 AM UTC
   - Archives old tracking data

## UI Components

### Admin Portal - Knowledge Management

#### Overview Tab
- Total entries, quality score, usage stats
- Resolution rate and reply time metrics
- Response source distribution chart

#### Entries Tab
- Search and filter knowledge entries
- Edit customer_context and agent_response
- Delete low-quality entries
- Add tags and categories

#### Performance Tab
- AI suggestion performance metrics
- Template usage statistics
- Knowledge base hit rate
- Daily/weekly trends

#### System Health Tab
- Real-time health metrics
- Batch operations (update embeddings)
- Download analytics reports
- Scheduled job status

### Conversation View - Reply Area

#### AI Suggestions
- Shows 3-5 contextual suggestions
- Displays quality score badge if from knowledge base
- One-click to insert into reply box

#### Feedback Rating
- Appears after sending AI/template-based reply
- 1-5 star rating + optional comment
- Dismissible
- Immediately updates tracking data

#### Visual Indicators
- Badge shows if reply uses AI/template/knowledge base
- Quality score displayed on knowledge-base suggestions
- Tracking indicator when suggestion selected

## User Flows

### Flow 1: Agent Uses AI Suggestion

1. Agent opens conversation with new customer message
2. System automatically generates AI suggestions via `suggest-replies`
3. Knowledge base is searched for similar past responses
4. AI crafts suggestions using proven responses as context
5. Agent selects and sends suggestion
6. `response_tracking` record created with source=ai_suggestion
7. Feedback prompt appears
8. Agent rates the suggestion (optional)
9. When customer replies, `track-outcome` calculates outcome metrics
10. If quality is high and used 3+ times, auto-promotes to knowledge base

### Flow 2: Customer Service Manager Reviews Performance

1. Manager navigates to Admin → Knowledge Management
2. Overview tab shows key metrics:
   - 247 knowledge entries
   - 4.3 average quality score
   - 1,234 uses this month
   - 87% resolution rate
3. Manager reviews Performance tab to see which sources work best
4. Manager uses Entries tab to edit/delete poor entries
5. Manager triggers manual embedding update if needed
6. Downloads analytics report for executive review

### Flow 3: System Learns Over Time

1. Agents handle conversations normally
2. System tracks every response (manual, AI, template)
3. Outcomes calculated automatically
4. Quality scores adjust based on:
   - Customer satisfaction
   - Resolution rate
   - Feedback ratings
   - Reply times
5. High-quality responses auto-promote to knowledge base
6. Future AI suggestions improve using proven responses
7. Low-quality entries naturally fade (lower quality score)

## Quality Score Calculation

```
quality_score = (
  avg_feedback_rating * 0.4 +
  resolution_rate * 30 * 0.3 +
  avg_satisfaction_score * 0.2 +
  reply_time_factor * 0.1
)

Where:
- avg_feedback_rating: 1-5 stars from agents
- resolution_rate: % of conversations resolved (0-1) * 30 to scale to 0-30
- avg_satisfaction_score: Sentiment analysis 1-5
- reply_time_factor: Inverse of reply time (faster = better)
```

## Configuration

### Tunable Parameters

**Auto-Promotion Thresholds** (in edge function):
```typescript
minQualityScore: 4.0  // Minimum quality to promote
minUsageCount: 3      // Minimum times used
```

**Similarity Search** (in suggest-replies):
```typescript
match_threshold: 0.75  // Cosine similarity threshold (0-1)
match_count: 3         // Max similar responses to include
```

**Quality Score Weights** (in SQL function):
```sql
feedback_weight: 0.4
resolution_weight: 0.3
satisfaction_weight: 0.2
time_weight: 0.1
```

## Testing Checklist

### Manual Testing

- [ ] Create conversation and use AI suggestion
- [ ] Verify response_tracking record created
- [ ] Submit feedback rating
- [ ] Verify quality_score updates
- [ ] Customer replies, verify outcome tracked
- [ ] Use same suggestion 3+ times
- [ ] Verify auto-promotion occurs
- [ ] Check knowledge entry appears in admin
- [ ] Edit knowledge entry
- [ ] Delete knowledge entry
- [ ] Search/filter entries
- [ ] Trigger batch embedding update
- [ ] Download analytics report
- [ ] View performance metrics

### Integration Testing

- [ ] AI suggestions include knowledge base context
- [ ] Feedback updates quality scores
- [ ] Auto-promotion creates valid embeddings
- [ ] Scheduled jobs run successfully
- [ ] Analytics calculations are accurate
- [ ] Visual indicators show correct source

### Performance Testing

- [ ] Vector search completes in <500ms
- [ ] AI suggestion generation <3s
- [ ] Batch embedding update handles 1000+ entries
- [ ] Analytics report generation <10s
- [ ] UI remains responsive during operations

## Troubleshooting

### Common Issues

**AI suggestions are generic (not using knowledge base)**
- Check if knowledge_entries exist for organization
- Verify embeddings are not null
- Check match_threshold (may be too high)
- Review find_similar_responses query

**Quality scores not updating**
- Verify feedback is being submitted
- Check update_knowledge_quality_from_feedback trigger
- Ensure response_outcomes are being created
- Review quality score calculation logic

**Auto-promotion not working**
- Check cron job is running (pg_cron enabled)
- Verify minQualityScore threshold
- Check if entries already promoted (knowledge_entry_id set)
- Review auto-promote-responses edge function logs

**Performance degradation**
- Check index on embeddings column
- Review query plans for slow queries
- Consider increasing match_count limit
- Monitor vector search performance

## Monitoring

### Key Metrics to Track

1. **Usage Metrics**
   - AI suggestions generated per day
   - Knowledge base hit rate
   - Template usage vs AI vs knowledge base

2. **Quality Metrics**
   - Average quality score trend
   - Resolution rate by source
   - Feedback rating distribution

3. **System Health**
   - Embedding generation success rate
   - Auto-promotion frequency
   - Query performance (p95 latency)

4. **Business Impact**
   - Average reply time trend
   - Customer satisfaction scores
   - Agent efficiency (replies per hour)

## Future Enhancements

### Planned Features

1. **Multi-language Support**
   - Detect language and search similar language responses
   - Cross-language embeddings

2. **Category-based Filtering**
   - Tag entries by topic (billing, technical, etc.)
   - Filter suggestions by conversation context

3. **A/B Testing Framework**
   - Test different prompts
   - Compare AI models
   - Measure impact on resolution rate

4. **Advanced Analytics**
   - Predictive quality scores
   - Trend analysis and forecasting
   - Agent performance benchmarking

5. **Smart Routing**
   - Route to agents based on expertise
   - Use knowledge base to identify complex issues
   - Suggest escalation when needed

## Security Considerations

1. **Data Privacy**
   - Customer data in embeddings (PII concerns)
   - Access control on knowledge entries
   - Audit logging for all operations

2. **RLS Policies**
   - Organization isolation enforced
   - User permissions checked
   - Service role for edge functions only

3. **API Keys**
   - OpenAI key stored securely
   - Supabase service key protected
   - No keys exposed to client

## Maintenance

### Regular Tasks

**Weekly**:
- Review quality score distribution
- Check for low-quality entries to delete
- Monitor auto-promotion success rate

**Monthly**:
- Download and archive analytics reports
- Review system health metrics
- Update embeddings if model changed

**Quarterly**:
- Audit knowledge base for outdated entries
- Review and adjust quality score weights
- Assess business impact and ROI
