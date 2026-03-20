
Fix three connected issues in the conversation view and reply flow.

1. Fix failed email sending
- Update `supabase/functions/send-reply-email/index.ts` so SendGrid payload uses valid content types:
  - `text/plain`
  - `text/html`
- Keep UTF-8 via the actual string content/meta, not `; charset=utf-8` in `content[].type`
- Redeploy `send-reply-email`

What I verified:
- The latest attempted reply was sent to `amanueltekber@gmail.com`
- It failed before delivery because SendGrid returned 400:
  - `The content type cannot contain ';'`
- So the addressing logic is now correct, but delivery is blocked by payload formatting

2. Fix blank/incorrect “To:” row in message cards
- Update `src/components/conversations/MessageCard.tsx`
- Current issue: the “To:” row is `flex-nowrap`, but the badge itself uses `shrink-0`, so it can still force awkward overflow/wrapping behavior
- Change the row to a proper truncation layout:
  - outer row: `min-w-0 flex items-center gap-2 overflow-hidden`
  - label: `shrink-0`
  - recipient chip container: `min-w-0 flex-1 overflow-hidden`
  - recipient badges: truncate instead of forcing full width
- Add an explicit fallback when `message.to` is empty on pending/failed agent messages:
  - show the conversation customer email if available
  - if not, show an em dash / “Unknown recipient”
- This prevents blank “To:” on unsent messages that do not yet have stored `email_headers`

3. Fix wrong customer/inbox identity in the header
- Update `src/components/dashboard/conversation-view/ConversationViewContent.tsx`
- The DB conversation is already correct:
  - customer = `Amanuel Tekber`
  - email = `amanueltekber@gmail.com`
- But the header/avatar area is still sourced through the current display helper and surrounding compact layout, while the screenshot also shows inbox branding nearby, which is making the top area misleading
- Make the header render the customer identity explicitly from `conversation.customer`
- Ensure the compact line always shows:
  - `Amanuel Tekber`
  - `· amanueltekber@gmail.com`
- Keep the inbox/sender identity separate from customer identity

4. Ensure sent agent messages show the real recipient email
- In `MessageCard.tsx`, keep preferring recipient email over display name for agent messages
- Also improve the “show all recipients” expanded text so it uses email-first formatting for agent messages too
- This avoids seeing `Dekkfix` when the important thing is the actual delivery target

5. Validation after implementation
- Confirm header shows `Amanuel Tekber · amanueltekber@gmail.com`
- Confirm pending/failed agent message shows `To: amanueltekber@gmail.com`
- Confirm no awkward line break in the “To:” row at the current desktop width
- Confirm resending succeeds and message status changes from `pending` to `sent`

Technical notes
- The March 19 message still shows `To: Dekkfix <hei@dekkfix.no>` because that historical message was actually sent before the routing fix
- The new reply attempt today was targeting `amanueltekber@gmail.com`, but SendGrid rejected the request before sending
- So this is now two separate problems:
  1. delivery bug in edge function payload
  2. UI fallback/layout bug for recipient rendering
