# Merge Cases into Conversations & Live Chat

Goal: every interaction with the same customer — email, live chat, phone — is visible in one place, with an easy-to-scan history, and cases become the connective tissue rather than a separate section under Operations.

## Where we are today

- `cases` is a real entity with SLA, owner, category, resolution codes and a `case_events` history.
- `conversations.case_id` and `calls.case_id` link threads and calls to a case.
- Live chat sessions link only to a conversation, so chat reaches a case indirectly.
- Case UI lives mostly in its own place (`/operations/cases`), with a small chip and a link/create card inside the conversation view.
- Customer history exists (`useCustomerRecord`) but each source (conversations, calls, notes, memories) renders as its own list — there is no single merged timeline.

## What we will build

### 1. One unified customer timeline
A single chronological stream that merges email threads, chat sessions, calls, notes and case events for a customer, with channel icons, direction, agent, and case reference on each row. Built once as a shared hook and reused in three places: the conversation side panel, the live chat side panel, and the customer detail page.

### 2. Cases visible everywhere an interaction is
- Conversation header: keep the case chip, extend it to show status, priority and SLA at a glance, plus a one-click "Create case" when none exists.
- Live chat: add the same case chip and case section to the chat panel, so an agent can create/link a case mid-chat.
- Calls: link a call to a case from the call detail/side panel.
- Case detail page: show all linked conversations *and* calls *and* chat sessions in one merged activity list, not just conversations.

### 3. Identity stitching so history is actually complete
- When an email, chat or call arrives with a known email/phone/user id, attach it to the existing customer through `customer_identities` instead of creating a parallel record.
- Add an "Merge / link identity" action in the customer panel for agents to attach a chat visitor or phone number to the right customer.
- Backfill existing chat sessions and calls onto customers where an email or phone matches.

### 4. Cases as the follow-up queue
- Surface "My cases" and "Overdue" counts in the main sidebar next to the inbox counts, so follow-up work is visible without leaving the inbox.
- Auto-suggest case creation when a conversation is snoozed, escalated, or reopened after being resolved — the moments where follow-up is actually required.
- Keep case status in sync both ways with conversation and chat status (already partly in place for conversations).

## Technical outline

- DB: add `case_id` to `widget_chat_sessions` (nullable, indexed) so chat can attach directly; add indexes on `conversations.case_id`, `calls.case_id`; keep RLS org-scoped and add the required GRANTs on any new object.
- New hook `useCustomerTimeline(customerId)` merging conversations, chat sessions, calls, notes and case events into one sorted array with a discriminated union item type.
- New component `CustomerTimeline.tsx` rendering that stream, with channel filter chips (All / Email / Chat / Phone / Notes).
- Extend `useCases.ts` with `useCaseActivity(caseId)` covering conversations + calls + chat sessions.
- Reuse `HeaderCaseChip` and `ConversationCaseSection` in the live chat layout (`ChatLayout` / chat side panel).
- Add case counts to the existing sidebar counts hook rather than a new polling source.

## Rollout order

1. Timeline hook + component, wired into the conversation side panel (immediate visible win, no schema change).
2. Live chat gets the case chip, case section and the same timeline panel.
3. Schema: `widget_chat_sessions.case_id` + indexes, then case activity view covering all three channels.
4. Identity stitching + backfill.
5. Case counts in the sidebar and the follow-up prompts.
6. "What's new" announcement describing the unified customer view.

## Out of scope for now

- Merging two customer records into one (destructive, needs its own design).
- Changing the Ops Tickets integration with the Navio backend.
