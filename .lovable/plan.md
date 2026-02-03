
# Fix Slack Native Push Notifications Preview

## Problem

Native Slack notifications on Mac and iPhone show "[no preview available]" instead of showing the sender name and message preview:

```
Dekkfix
#customer-support-messages
Support App notifications: [no preview available]
```

## Root Cause

The `send-slack-notification` edge function sends Slack messages using only Block Kit `blocks` and `attachments`, but **omits the `text` field**. 

According to Slack's API:
> "The `text` argument is used in places where content cannot be rendered such as: **system push notifications**, assistive technology such as screen readers, etc."

When `text` is missing, native device notifications cannot display the message content.

## Solution

Add a `text` field to the `chat.postMessage` call containing a plain-text fallback. This text appears in push notifications but NOT in the Slack channel (where Block Kit is displayed).

### Desired Notification Preview

```
Dekkfix
#customer-support-messages
New Email from John Smith: Hvordan kan jeg endre bestillingen min?
```

### Code Change

Add a fallback text builder in `send-slack-notification/index.ts`:

```typescript
// Build fallback text for native push notifications
let fallbackText = title;
if (customer_name) {
  fallbackText += ` from ${customer_name}`;
}
if (preview_text) {
  const cleanedPreview = cleanPreviewText(preview_text, 100);
  if (cleanedPreview) {
    fallbackText += `: ${cleanedPreview}`;
  }
}

// Send to Slack with text field
await fetch('https://slack.com/api/chat.postMessage', {
  // ...
  body: JSON.stringify({
    channel: channelId,
    text: fallbackText,  // <-- ADD THIS
    blocks: blocks,
    attachments: [...],
  }),
});
```

### Example Output

| Event Type | Fallback Text |
|------------|---------------|
| New conversation | "New Email Conversation from John Smith: Hvordan kan jeg..." |
| Customer reply | "Email Reply from Maria K: Takk for hjelpen, men jeg..." |
| Assignment | "Assigned to Ole Nordmann" |
| SLA Warning | "SLA Warning: Response time exceeded for John Smith" |

## File to Modify

| File | Change |
|------|--------|
| `supabase/functions/send-slack-notification/index.ts` | Add `text` field to chat.postMessage call with plain-text fallback |

## Result

After this change, native notifications on Mac/iPhone will show:

```
Dekkfix
#customer-support-messages
New Email from John Smith: Hvordan kan jeg endre bestillingen...
```

Instead of "[no preview available]".
