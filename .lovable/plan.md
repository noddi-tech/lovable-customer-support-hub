

# Fix Agent Name in Signature + Improve Design & Branding Page

## Problem 1: Agent name appears even when "Include Agent Name" is OFF

**Root cause**: In `send-reply-email/index.ts` (line 328-329), when `include_agent_name` is false, the code replaces `{{agent_name}}` with "Support Team" instead of simply removing the placeholder. So if the signature is set to just "Noddi", there's no `{{agent_name}}` to replace — but the default template has "Best regards,\<br\>{{agent_name}}\<br\>Support Team", which means toggling the switch OFF still injects "Support Team" where the agent name would be.

**Chat vs Email**: Chat messages (ChatReplyInput) do NOT use signatures at all — they insert raw message content. This is correct behavior for chat. Only email replies go through `send-reply-email` which applies the signature. So the bug is email-only.

**Fix**: When `include_agent_name` is OFF, remove the `{{agent_name}}` placeholder entirely (replace with empty string) rather than substituting "Support Team". Also fix the preview in `EmailTemplateSettings.tsx` (line 289) to match this behavior.

### Changes

**`supabase/functions/send-reply-email/index.ts`** (~line 328-329):
- Change the else branch from `signature.replace('{{agent_name}}', 'Support Team')` to `signature.replace('{{agent_name}}', '').replace(/(<br\s*\/?>)+/g, '<br>')` — removes the placeholder and cleans up consecutive line breaks

**`src/components/settings/EmailTemplateSettings.tsx`** (~line 289):
- Change preview from replacing `{{agent_name}}` with 'Support Team' to replacing with empty string when `include_agent_name` is off, to match actual behavior

Deploy updated edge function.

---

## Problem 2: Design & Branding page needs to be the source of truth

The current Design & Branding page at `/admin/design` has three tabs: Design Library (color tokens), Components (button config), and Email Templates (signature/header/footer). The email template settings are the actual source of truth for signature behavior but they're buried as a third tab and the UI doesn't clearly explain what controls what.

### Changes

**`src/components/settings/EmailTemplateSettings.tsx`**:
- Add a clear info alert at the top explaining that these settings control how outbound emails look to customers
- Add a note under the signature section explaining: "When 'Include Agent Name' is off, the {{agent_name}} placeholder will be removed from the signature"
- Improve the preview to show a more realistic rendering with the agent name toggle visually reflected
- Add descriptive helper text under each section (Header, Body, Signature, Footer) so admins understand what each section controls

**`src/components/admin/AdminPortal.tsx`** (~line 92-113):
- Rename the "Email Templates" tab to "Email Signature & Branding" for clarity
- Reorder tabs: move email signature/branding to be the first tab (most commonly used), followed by Design Library and Components

## Technical details
- Chat does not use signatures — confirmed by reviewing ChatReplyInput which inserts messages directly without signature logic
- The edge function deployment is required after the signature fix
- No database changes needed
- The `{{agent_name}}` cleanup regex handles cases like `"Best regards,<br><br>Support Team"` that would result from removing the name

