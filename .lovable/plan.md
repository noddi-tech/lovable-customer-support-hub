

## Fix: Richer Sentiment Analysis Card + Trigger Daily Digest

### Problem
The Sentiment Analysis card shows bare percentage bars with no context — impossible to understand *why* sentiment is positive/negative. The AI already returns a `summary` and `themes` (with per-theme sentiment), but none of that context appears in the sentiment card.

### Changes

**`src/components/operations/OperationsAnalyticsDashboard.tsx`** — Enhance the Sentiment Analysis card (lines 221-257):

- Add the AI `summary` as a `CardDescription` below the title — this is the 2-3 sentence overview the AI generates
- Below the percentage bars, add a "Key Drivers" section showing themes grouped by sentiment:
  - Positive themes with green badge + mention count
  - Negative themes with red badge + mention count  
  - Neutral themes with gray badge
- Add total message count analyzed (e.g., "Based on 47 customer messages")
- Show common questions as a collapsible section or tooltip for additional context

Layout:
```text
┌─────────────────────────────────────────┐
│ 🧠 Sentiment Analysis                  │
│ "Overall customer sentiment is mixed... │
│  booking issues driving negativity..."  │
│                                         │
│ Positive  ████████████░░░░░  45%        │
│ Neutral   █████░░░░░░░░░░░░  25%        │
│ Negative  ██████░░░░░░░░░░░  30%        │
│                                         │
│ Key Drivers                             │
│ 🟢 Quick responses (12 mentions)       │
│ 🟢 Helpful staff (8 mentions)          │
│ 🔴 Booking errors (15 mentions)        │
│ 🔴 Payment issues (6 mentions)         │
│                                         │
│ Based on 47 customer messages           │
└─────────────────────────────────────────┘
```

**Trigger daily digest**: Invoke `slack-daily-digest` edge function with `{"digest_type": "daily"}` after deploying.

### Files changed

| File | Change |
|---|---|
| `src/components/operations/OperationsAnalyticsDashboard.tsx` | Enhance sentiment card with summary, theme drivers, and message count |
| Edge function invocation | Trigger `slack-daily-digest` |

No backend changes needed — all the data (`summary`, `themes`, `sentimentBreakdown`) is already returned by the edge function.

