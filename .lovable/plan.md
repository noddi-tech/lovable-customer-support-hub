
# Fix: Email Not Sending + Inbox Switching on New Conversation

## Issue 1: Email Not Delivered

**Root Cause**: When creating a new conversation from the DekkFix inbox, the code in `NewConversationDialog.tsx` looks for an `email_accounts` row linked to the inbox to determine if it can send email. DekkFix has no `email_accounts` entry -- it only has an `inbound_routes` entry with `hei@dekkfix.no`. So the code hits the `else` branch ("No email account connected to inbox, email not sent") and silently skips sending.

The `send-reply-email` edge function already supports sending via inbound routes (it checks `inbound_routes.group_email` first), so the message *would* send if the function were called.

**Fix** in `src/components/dashboard/NewConversationDialog.tsx` (~lines 130-150):
- After checking `email_accounts` for the inbox, also check `inbound_routes` for a `group_email`.
- If either exists, proceed to call `send-reply-email`. The edge function already handles both sources.
- Update the condition from `if (emailAccountId && newMessage)` to `if ((emailAccountId || hasInboundRoute) && newMessage)`.

## Issue 2: Auto-switching to Noddi Inbox

**Root Cause**: After creating a conversation, `NewConversationDialog` navigates to `/?conversation=${conversation.id}` (line 266). This navigates to the root URL without preserving the current inbox, so `EnhancedInteractionsLayout` falls back to selecting the first inbox (Noddi) as default.

**Fix** in `src/components/dashboard/NewConversationDialog.tsx` (line 266):
- Instead of navigating to `/?conversation=${id}`, preserve the current URL path and just update the conversation query param.
- Use `window.location.pathname` or the current inbox context to stay in the same inbox.
- Change to: navigate to the current interactions path with the inbox and conversation params preserved.

Also fix the same pattern in `src/pages/SearchPage.tsx` (line 272) which has the same issue.

## Technical Details

### File: `src/components/dashboard/NewConversationDialog.tsx`

**Change 1 -- Email sending gate** (lines 130-151):
```typescript
// Current: only checks email_accounts
let emailAccountId = null;
const { data: emailAccounts } = await supabase
  .from('email_accounts')
  .select('id')
  .eq('inbox_id', conversationData.inboxId)
  .limit(1);

// New: also check inbound_routes as fallback
let canSendEmail = false;
if (emailAccounts?.length) {
  emailAccountId = emailAccounts[0].id;
  canSendEmail = true;
} else {
  // Check inbound_routes for a group_email (used by send-reply-email)
  const { data: inboundRoutes } = await supabase
    .from('inbound_routes')
    .select('id, group_email')
    .eq('inbox_id', conversationData.inboxId)
    .eq('is_active', true)
    .limit(1);
  if (inboundRoutes?.length && inboundRoutes[0].group_email) {
    canSendEmail = true;
  }
}
```

Update the sending gate from `if (emailAccountId && newMessage)` to `if (canSendEmail && newMessage)`.

**Change 2 -- Preserve inbox on navigation** (line 266):
```typescript
// Current:
navigate(`/?conversation=${conversation.id}`);

// New: preserve current inbox context
const currentParams = new URLSearchParams(window.location.search);
const currentInbox = currentParams.get('inbox') || selectedInboxId;
const basePath = window.location.pathname.includes('/interactions')
  ? window.location.pathname
  : '/interactions/text/open';
navigate(`${basePath}?inbox=${currentInbox}&c=${conversation.id}`);
```

### File: `src/pages/SearchPage.tsx`

**Change** (line 272): Same fix -- preserve inbox context when navigating to a conversation from search results.
