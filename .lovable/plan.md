

## Fix: Raw HTML displayed in chat messages

**Problem**: The chat message bubble on line 258 of `ChatMessagesList.tsx` renders `message.visibleBody` as plain text via `{message.visibleBody}`. When a customer replies from an email client (like Outlook), the message content is HTML — so the raw tags are shown instead of rendered content.

The email view (`MessageItem.tsx`) correctly uses `<EmailRender>` for this. The chat view needs the same treatment, but adapted for chat bubbles.

### Fix in `ChatMessagesList.tsx`

1. **Import** `EmailRender` from `@/components/ui/email-render` and `sanitizeEmailHTML` from `@/utils/htmlSanitizer`
2. **Replace** the plain text render (`{message.visibleBody}`) with:
   - If the original message `content_type` is `text/html`, render using `dangerouslySetInnerHTML` with sanitized HTML (or use `EmailRender` component)
   - If plain text, keep current behavior
3. **Detect content type**: Use `message.originalMessage?.content_type` — if it contains `html`, render as HTML
4. **Style override**: Add scoped CSS so rendered HTML inside chat bubbles inherits the bubble's text color and doesn't break the layout (e.g., reset font-family, font-size from Outlook styles)

**Approach**: Use `EmailRender` component (already battle-tested for email content) inside the chat bubble, with a wrapper that constrains styles. This handles encoding fixes, CID images, sanitization — all already solved.

```
// Line 252-260 replacement
<div className={cn(
  "px-4 py-3 rounded-2xl text-sm leading-relaxed break-words",
  isAgent ? "..." : "...",
  "chat-bubble-content" // new class for style containment
)}>
  <EmailRender
    content={message.visibleBody}
    contentType={message.originalMessage?.content_type || 'text/plain'}
    attachments={parsedAttachments}
    messageId={message.id}
  />
</div>
```

5. **Remove `whitespace-pre-wrap`** from the bubble div — `EmailRender` handles its own whitespace for both plain text and HTML

### File changed

| File | Change |
|---|---|
| `src/components/conversations/ChatMessagesList.tsx` | Import `EmailRender`, replace `{message.visibleBody}` with `<EmailRender>`, parse attachments properly, add style containment for HTML in bubbles |

