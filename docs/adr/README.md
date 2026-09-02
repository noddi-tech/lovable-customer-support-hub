# Architecture Decision Records

This folder follows the
[Architecture Decision Record](https://github.com/architecture-decision-record/architecture-decision-record)
convention: one file per decision, numbered sequentially, never rewritten once accepted.

## Format

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by ADR-XXXX
- Date: YYYY-MM-DD
- Deciders: who agreed

## Context
The forces at play: what problem, what constraints, what was tried.

## Decision
What we do, stated in the present tense.

## Consequences
What becomes easier, what becomes harder, what we now have to live with.
```

## Rules

1. Numbers are never reused. Copy the next free number.
2. An accepted ADR is immutable. To change a decision, write a new ADR and set the old one's
   status to `Superseded by ADR-XXXX`.
3. Keep it short. If it does not change how someone writes code, it is not a decision record.

## Index

| # | Decision | Status |
|---|----------|--------|
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](./0002-stay-on-tailwind-css-v3.md) | Stay on Tailwind CSS v3 | Accepted |
| [0003](./0003-supabase-as-the-single-backend-platform.md) | Supabase as the single backend platform | Accepted |
| [0004](./0004-per-organization-role-hierarchy-in-a-dedicated-table.md) | Per-organization role hierarchy in a dedicated table | Accepted |
| [0005](./0005-branded-profileid-and-authuserid-types.md) | Branded ProfileId and AuthUserId types | Accepted |
| [0006](./0006-email-threading-as-a-matching-cascade.md) | Email threading as a matching cascade | Accepted |
| [0007](./0007-inbound-email-pipeline-google-group-to-sendgrid-to-edge-function.md) | Inbound email pipeline: Google Group to SendGrid to edge function | Accepted |
| [0008](./0008-one-outbound-email-utility.md) | One outbound email utility | Accepted |
| [0009](./0009-third-party-integrations-live-in-an-integrations-folder.md) | Third-party integrations live in an integrations folder | Accepted |
| [0010](./0010-oslo-local-time-everywhere-in-the-product-surface.md) | Oslo local time everywhere in the product surface | Accepted |
| [0011](./0011-ai-answers-with-interactive-markers-not-prose-instructions.md) | AI answers with interactive markers, not prose instructions | Accepted |
| [0012](./0012-confidence-scoring-gates-ai-autonomy.md) | Confidence scoring gates AI autonomy | Accepted |
| [0013](./0013-slack-alerting-split-from-critical-triage.md) | Slack alerting split from critical triage | Accepted |
| [0014](./0014-conversation-lifecycle-is-driven-by-inbound-activity.md) | Conversation lifecycle is driven by inbound activity | Accepted |
| [0015](./0015-immutable-admin-audit-log.md) | Immutable admin audit log | Accepted |
| [0016](./0016-uptime-first-no-speculative-refactors-on-hot-paths.md) | Uptime first: no speculative refactors on hot paths | Accepted |
| [0017](./0017-documentation-is-rendered-inside-the-app-at--docs.md) | Documentation is rendered inside the app at /docs | Accepted |
