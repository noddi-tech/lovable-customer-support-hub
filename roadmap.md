# Support ticketing roadmap

## Phase 1 — Customer record
- [x] `customer_identities` table + backfill from customers (email/phone)
- [x] `customer_notes` (customer-level, replaces dummy CustomerNotes)
- [x] `/customers/:id` page: unified timeline (conversations, calls, cases, notes, AI summary)
- [x] "Previous contacts" card in CustomerSidePanel

## Phase 2 — Cases
- [x] `cases`, `case_events`, `case_categories`, `case_resolution_codes`, `case_tags`
- [x] `conversations.case_id`, `calls.case_id`
- [x] Case detail page + create/link case from conversation
- [x] Close requires resolution code; closing a thread never closes the case
- [x] Navio ops-ticket id column on case (`navio_ticket_id`)

## Phase 3 — Accountability
- [x] `sla_policies` per inbox/priority; auto due dates on case create (DB trigger)
- [x] Assign-on-reply (conversation owner + case owner + first response stamp)
- [x] "My work" queues (mine / overdue / unassigned / waiting) + breach badges
- [ ] Breach notifications pushed through the existing notification system (scheduled job)

## Phase 4 — Insight
- [x] Category/resolution taxonomy enforced on resolve
- [x] Reporting: contact reasons, resolution mix, avg resolution time, agent load
- [x] Taxonomy editor (categories + resolution codes)
- [ ] Repeat-contact rate and FRT-vs-SLA trend over time

## Build health
- [ ] Fix all current preview typecheck/build errors
