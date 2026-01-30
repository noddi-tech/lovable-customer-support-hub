

# Plan: Unify Slack Notification Format

## Problem Summary
Based on your screenshots, Slack notifications have inconsistencies:
- **Colors vary**: Green for new conversations, blue for replies, purple for assignments
- **Preview missing**: Some notifications (like assignments) only show subject, no message preview
- **No source indicator**: Can't tell if it came from widget, email, etc.

## Solution Overview
Unify all notifications with:
1. **Single color** for all notifications (brand blue #3b82f6)
2. **Always show subject + 180-char preview** (optimal for Slack readability)
3. **Add source label** showing: "via Email", "via Widget", "New Conversation", "Customer Reply", etc.

## Changes Required

### 1. Database Trigger Updates
Need to pass the `channel` field to the edge function and fetch preview text for assignment/closed events.

**File: New migration for `notify_slack_on_new_message`**
- Add `channel` field to the payload

**File: New migration for `notify_slack_on_conversation_update`**
- Add `channel` field to the payload
- Fetch latest message content for preview_text on assignment and closed events

### 2. Edge Function Updates

**File: `supabase/functions/send-slack-notification/index.ts`**

Changes:
1. Add `channel` to the request interface
2. Remove per-event colors - use single brand color
3. Create source label combining event_type + channel
4. Always include preview section (already mostly done, but ensure it shows)
5. Update preview length to 180 characters

**Updated Interface:**
```typescript
interface SlackNotificationRequest {
  // ... existing fields
  channel?: 'email' | 'widget' | 'chat' | 'facebook' | 'instagram' | 'whatsapp';
}
```

**New Source Labels:**
| Event Type | Channel | Label |
|------------|---------|-------|
| new_conversation | email | "New Email Conversation" |
| new_conversation | widget | "New Widget Conversation" |
| customer_reply | email | "Email Reply" |
| customer_reply | widget | "Widget Reply" |
| assignment | any | "Assignment Changed" |
| conversation_closed | any | "Conversation Closed" |

**Unified Message Format:**
```text
┌─────────────────────────────────────────────────────┐
│ 📧 New Email Conversation in Noddi                  │  ← Source + inbox
├─────────────────────────────────────────────────────┤
│ From:                     Subject:                  │
│ Aleksander Wang-Hansen    Contact form submission   │
│ (email@example.com)       from Aleksander...        │
├─────────────────────────────────────────────────────┤
│ > Hei. Jeg lurer på hva det koster å få skiftet    │  ← Always show 180 chars
│   dekk på en bil. Om det er 699,- per dekk eller...│
├─────────────────────────────────────────────────────┤
│ [👀 View Conversation]                              │
├─────────────────────────────────────────────────────┤
│ ⏰ 1/30/26, 9:02 AM                                 │
└─────────────────────────────────────────────────────┘
```

## Implementation Details

### Database Migration Changes

**New function: `notify_slack_on_new_message`**
```sql
-- Add 'channel' to the payload
'channel', v_conversation.channel
```

**New function: `notify_slack_on_conversation_update`**
```sql
-- Add 'channel' to all payloads
'channel', NEW.channel

-- For assignment/closed events, fetch preview from latest message:
v_latest_message RECORD;

SELECT content INTO v_latest_message 
FROM messages 
WHERE conversation_id = NEW.id 
ORDER BY created_at DESC 
LIMIT 1;

-- Add to payload:
'preview_text', strip_html_tags(LEFT(v_latest_message.content, 200))
```

### Edge Function Changes

**Remove color mapping - use single color:**
```typescript
// Before: Different colors per event
const EVENT_COLORS = { new_conversation: '#22c55e', customer_reply: '#3b82f6' };

// After: Single brand color
const NOTIFICATION_COLOR = '#3b82f6'; // Consistent blue
```

**Add source labels:**
```typescript
const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  widget: 'Widget',
  chat: 'Chat',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
};

// Build dynamic title
const channelLabel = CHANNEL_LABELS[channel || 'email'] || 'Email';
let title: string;

switch (event_type) {
  case 'new_conversation':
    title = `New ${channelLabel} Conversation`;
    break;
  case 'customer_reply':
    title = `${channelLabel} Reply`;
    break;
  case 'assignment':
    title = assigned_to_name ? `Assigned to ${assigned_to_name}` : 'Assignment Changed';
    break;
  case 'conversation_closed':
    title = 'Conversation Closed';
    break;
  default:
    title = 'Notification';
}
```

**Update preview length:**
```typescript
// Change from 200 to 180 (optimal for Slack without truncation)
const cleanedPreview = cleanPreviewText(preview_text, 180);
```

**Always show subject in header:**
```typescript
// Ensure subject is always included (already done, but verify)
attachmentBlocks.push({
  type: 'section',
  fields: [
    { type: 'mrkdwn', text: `*From:*\n${customer_name}${customer_email ? ` (${customer_email})` : ''}` },
    { type: 'mrkdwn', text: `*Subject:*\n${subject || 'No subject'}` }, // Always show
  ],
});
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new]_slack_notification_channel.sql` | Add channel field to both trigger functions, fetch preview for assignment/closed |
| `supabase/functions/send-slack-notification/index.ts` | Unified color, source labels, always show preview |

## Testing

After implementation:
1. Send a test notification from widget → should show "New Widget Conversation"
2. Send a test notification from email → should show "New Email Conversation"
3. Reply to a conversation → should show "Email Reply" or "Widget Reply"
4. Assign a conversation → should show preview text now (previously missing)
5. Close a conversation → should show preview text now (previously missing)
6. All notifications should have the same blue color

## Result

All Slack notifications will:
- Have consistent blue color
- Show clear source: "New Email Conversation", "Widget Reply", etc.
- Always display subject line
- Always display 180-character message preview
- Be easier to scan and understand at a glance

