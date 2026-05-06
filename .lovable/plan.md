## Goal

When a conversation is a recruitment thread (no `customer_id`, but has `applicant_id`), show the applicant's name (or email fallback) in place of "Unknown" — same priority as the Noddi inbox: full name → email → "Unknown".

The RPC already returns `applicant: { id, first_name, last_name, email }` and `conversation_type`. We just need the UI to use it.

## Changes

### 1. `src/components/dashboard/conversation-list/ConversationListItem.tsx`

Replace the `customerName` / `customerInitial` derivation with a recruitment-aware resolver:

```ts
const applicant = (conversation as any).applicant;
const applicantName = applicant
  ? [applicant.first_name, applicant.last_name].filter(Boolean).join(' ').trim()
  : '';

const displayName =
  conversation.customer?.full_name ||
  applicantName ||
  applicant?.email ||
  conversation.customer?.email ||
  'Unknown';

const displayInitial = (displayName?.[0] || 'C').toUpperCase();
```

Use `displayName` / `displayInitial` for the avatar fallback and the bold name in the row. Add `applicant` to the `useMemo` deps.

The existing purple "Søker: …" badge stays as-is (it's redundant with the name now, but we keep it as the explicit recruitment marker — can be revisited later).

### 2. `src/components/dashboard/conversation-view/ConversationHeader.tsx`

Same fallback for the avatar fallback letter on line 97 (and any name rendering nearby — verify in the same pass): use applicant first/last/email when `conversation.customer` is absent.

### 3. No DB / RPC changes

`get_conversations_with_session_recovery` (2-arg) already returns `applicant` jsonb and `conversation_type`. Confirmed in migration `20260505192429`.

The single-conversation view loader (used by `ConversationHeader` / `CustomerSidePanel`) needs to also expose `applicant` if it doesn't already. Will check `data/interactions.ts` and the conversation detail loader during implementation; if missing, extend the select to include `applicant_id, applicants(id, first_name, last_name, email)` and surface it on the conversation object the same shape as the list RPC.

## Out of scope

- Google Group external-member setting (user is flipping this manually).
- Reply-To header rewrite (parked).
- Replacing the "Søker: …" badge.

## Verification

1. Open the recruitment inbox — list rows now show applicant name (e.g., "Ola Nordmann") instead of "Unknown", avatar initial uses first letter of that name.
2. Open the conversation — header avatar fallback shows the right initial; "Søker: …" badge still present.
3. Regular support conversations (with `customer_id`) are unchanged.
