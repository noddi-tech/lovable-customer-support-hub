
# Per-Inbox Email Templates

## What Changes

Currently there is one email template per organization. Replies from all inboxes (Noddi, Dekkfix, etc.) use the same signature and styling. This fix adds the ability to assign different templates to different inboxes.

## Changes Required

### 1. Database: Add `inbox_id` column to `email_templates`

A migration to:
- Add an optional `inbox_id` (uuid, FK to `inboxes.id`) column to `email_templates`
- Allow multiple templates per org (one per inbox + one org-wide default with `inbox_id = NULL`)

### 2. Admin UI: Inbox selector on Conversation Reply template

**File: `src/components/settings/EmailTemplateSettings.tsx`**

- Add an inbox dropdown at the top of the "Conversation Reply" tab (only shown for that template type)
- Options: "Organization Default" (inbox_id = null) + each inbox from the org
- When an inbox is selected, load/save the template for that specific inbox
- Uses existing `useQuery` to fetch inboxes from Supabase
- The query for templates adds `.eq('inbox_id', selectedInboxId)` or `.is('inbox_id', null)` for the default

### 3. Edge Function: Prefer inbox-specific template

**File: `supabase/functions/send-reply-email/index.ts`**

Update the template loading logic (around line 146) to:
1. First try to load a template matching the conversation's `inbox_id`
2. If none found, fall back to the org-wide default (where `inbox_id IS NULL`)

```text
Current:  email_templates WHERE org_id = X AND is_default = true  (single query)

New:      email_templates WHERE org_id = X AND inbox_id = Y       (inbox-specific)
          if not found ->
          email_templates WHERE org_id = X AND inbox_id IS NULL   (org default)
          if not found ->
          hardcoded fallback
```

### 4. TypeScript types update

**File: `src/integrations/supabase/types.ts`**

Add `inbox_id: string | null` to the `email_templates` Row/Insert/Update types.

## Summary

| Layer | Change |
|---|---|
| Database | Add `inbox_id` column to `email_templates` |
| Admin UI | Add inbox selector dropdown on Conversation Reply template |
| Edge Function | Load inbox-specific template first, fall back to org default |
| Types | Add `inbox_id` to TypeScript types |

This lets you configure a "Dekkfix" signature for the Dekkfix inbox and a "Noddi" signature for other inboxes.
