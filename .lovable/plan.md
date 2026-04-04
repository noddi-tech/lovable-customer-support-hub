

# Fix Remaining Build Errors + Bulk Customer Outreach Plan

This plan covers two things: first fixing the remaining TypeScript build errors from the previous round, then implementing the bulk outreach feature.

---

## Part A: Fix Remaining Build Errors

The previous fix round missed several files and introduced a parameter mismatch in `noddi-customer-lookup`. Here are all remaining errors:

### A1. `noddi-customer-lookup/index.ts` — parameter name mismatch + null types

The `buildResponse` call at line 1331 uses camelCase names (`noddihUserId`, `userGroupId`, `unpaidCount`, `orderTags`, `matchMode`, `conflict`) that don't exist on the function signature (which uses `noddi_user_id`, `user_group_id`, `unpaid_count`, `enriched_order_tags`). Fix by mapping to the correct snake_case names and dropping unknown keys.

**Line 1331-1344**: Rewrite the `buildResponse({...})` call to use correct parameter names:
```typescript
const response = buildResponse({
  source: "live",
  ttl_seconds: CACHE_TTL_SECONDS,
  found: true,
  email: successfulEmail || "",
  noddi_user_id: noddihUser.id,
  user_group_id: selectedGroup.id,
  user: noddihUser,
  userGroup: selectedGroup,
  all_user_groups: allUserGroupsFormatted,
  priority_booking: bookingForCache,
  priority_booking_type: priorityBookingType,
  unpaid_count: pendingBookings.length,
  unpaid_bookings: pendingBookings,
  enriched_order_tags: enrichedTags,
});
```

**Line 594 & 1580**: `resolveDisplayName` expects `email?: string` but receives `string | null`. Fix by coercing: `email: successfulEmail || undefined` (line 594: `email: email ?? undefined`).

**Line 623**: `NoddiLookupResponse.data.email` is typed `string` but `buildResponse` receives `string | null`. Change the response type's `email` field to `string` and ensure `email` is coerced to `""` when null in the return object: `email: email ?? ""`.

**Line 1568**: Same issue — `email: successfulEmail` where `successfulEmail` is `string | null`. Fix: `email: successfulEmail || ""`.

### A2. `error.message` on `unknown` — 4 missed files

| File | Line | Fix |
|------|------|-----|
| `noddi-search-by-name/index.ts` | 157 | `error instanceof Error ? error.message : String(error)` |
| `resend-user-invite/index.ts` | 188 | Same pattern |
| `review-open-critical/index.ts` | 237 | Same pattern |
| `send-chat-transcript/index.ts` | 254 | Same pattern |
| `send-slack-notification/index.ts` | 640 | Same pattern |

### A3. `send-organization-invite/index.ts` — `.name` on array type (line 119)

The Supabase query `.select("role, organization_id, organizations(name)")` returns `organizations` as `{ name: any }[]` (array), not a single object. Fix: `(membership.organizations as any)?.name || "the organization"` or access `membership.organizations?.[0]?.name`.

### A4. `send-ticket-notification/index.ts` — `body` variable conflict (lines 44 + 118)

`const body: NotificationRequest` at line 44 conflicts with `let body = ''` at line 118. Rename the email body variable to `emailBody`:
- Line 118: `let emailBody = '';`
- Lines 123, 128, 133, 138, 143: change all `body =` assignments to `emailBody =`
- Line 162: `message: emailBody.substring(0, 200)`

---

## Part B: Bulk Customer Outreach Feature

### Overview

A 4-step wizard page at `/bulk-outreach` that lets agents look up customers by license plate or Noddi route/date, compose a message, and send individual email conversations to each customer.

### Database

New table `bulk_outreach_jobs` with RLS scoped to the agent's organization:

| Column | Type |
|--------|------|
| id | uuid PK |
| organization_id | uuid FK → organizations |
| created_by | uuid (auth.uid) |
| subject | text |
| message_template | text |
| inbox_id | uuid FK → inboxes |
| recipient_count | int default 0 |
| sent_count | int default 0 |
| failed_count | int default 0 |
| status | text default 'pending' |
| recipients | jsonb |
| created_at | timestamptz default now() |

RLS: select/insert for authenticated users where `organization_id` matches their membership.

### Edge Function: `bulk-outreach/index.ts`

Three actions routed by `action` field in request body:

1. **`resolve_plates`** — For each plate, calls Noddi `GET /v1/cars/from-license-plate-number/?license_plate_number={plate}` to get car data, then uses phone/email from the car's user group to look up the customer via the existing customer-lookup pattern. Returns `{ plate, name, email, phone, matched: boolean }[]`.

2. **`list_route_bookings`** — Calls Noddi bookings API filtered by date. Returns booking list with customer name, email, phone, and car plate for each.

3. **`send_bulk`** — Receives `{ recipients, subject, message_template, inbox_id, organization_id }`. For each recipient:
   - Upsert customer by email + organization_id
   - Create conversation (channel: `email`, status: `open`)
   - Insert message with `{name}` replaced by customer name
   - Invoke `send-reply-email` to deliver
   - Track per-recipient status in `bulk_outreach_jobs.recipients` jsonb

### Frontend Components

| Component | Purpose |
|-----------|---------|
| `src/pages/BulkOutreach.tsx` | Main wizard page with 4 steps |
| `src/components/bulk-outreach/PlateInput.tsx` | Textarea for pasting plates (comma/newline separated) with "Look Up" button |
| `src/components/bulk-outreach/RouteDatePicker.tsx` | Date picker that loads bookings from Noddi for that date |
| `src/components/bulk-outreach/RecipientReview.tsx` | Table with checkboxes showing matched customers, highlights failures |
| `src/components/bulk-outreach/MessageComposer.tsx` | Subject + body textarea with `{name}` variable, inbox selector dropdown |
| `src/components/bulk-outreach/SendConfirmation.tsx` | Summary count, single email preview, send button with progress |

### Navigation

- Add to operations group in `src/navigation/nav-config.ts` with `requiredRole: 'agent'`
- Route added to `App.tsx` inside the protected route section
- Icon: `Send` from lucide-react

### Files to create/modify

| File | Action |
|------|--------|
| `supabase/functions/bulk-outreach/index.ts` | Create |
| Migration SQL | Create `bulk_outreach_jobs` table + RLS |
| `src/pages/BulkOutreach.tsx` | Create |
| `src/components/bulk-outreach/PlateInput.tsx` | Create |
| `src/components/bulk-outreach/RouteDatePicker.tsx` | Create |
| `src/components/bulk-outreach/RecipientReview.tsx` | Create |
| `src/components/bulk-outreach/MessageComposer.tsx` | Create |
| `src/components/bulk-outreach/SendConfirmation.tsx` | Create |
| `src/navigation/nav-config.ts` | Add bulk outreach nav item |
| `src/App.tsx` | Add `/bulk-outreach` route |
| 10 edge function files (Part A) | Fix TypeScript errors |

