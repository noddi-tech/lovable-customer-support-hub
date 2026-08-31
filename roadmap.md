# Support ticketing roadmap

## Phase 1 — Customer record
- [ ] `customer_identities` table + backfill from customers (email/phone)
- [ ] `customer_notes` (customer-level, replaces dummy CustomerNotes)
- [ ] `/customers/:id` page: unified timeline (conversations, calls, chats, cases, notes)
- [ ] "Previous conversations (N)" + AI summary/memories in CustomerSidePanel

## Phase 2 — Cases
- [ ] `cases`, `case_events`, `case_categories`, `case_resolution_codes`, `case_tags`/`case_tag_links`
- [ ] `conversations.case_id`, `calls.case_id`
- [ ] Case detail page + create/link case from conversation
- [ ] Close requires resolution code; closing a thread never closes the case
- [ ] Navio ops-ticket id on case

## Phase 3 — Accountability
- [ ] `sla_policies` per inbox/priority; auto due dates on case create
- [ ] Owner required; assign-on-reply
- [ ] "My work" queue (owned/overdue/waiting) + breach flagging
- [ ] Breach notifications via existing notification system

## Phase 4 — Insight
- [ ] Category/resolution taxonomy enforced on close
- [ ] Reporting: contact reasons, repeat-contact rate, FRT/resolution vs SLA, agent load
