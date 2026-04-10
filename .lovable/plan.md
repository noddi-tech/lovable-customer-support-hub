

# Clean Up Slack Notification Format

## Changes (single file: `supabase/functions/send-slack-notification/index.ts`)

### 1. Increase preview quote to 300 characters
- Line 357: change `cleanPreviewText(preview_text, 180)` to `cleanPreviewText(preview_text, 300)`

### 2. Simplify fallback text (no duplicate info)
- Lines 317-326: Replace with just `"${emoji} ${title}${inbox_name ? ' in ' + inbox_name : ''}"` -- no customer name or preview appended (those already appear in the blocks)

### 3. Add channel type to context footer
- Lines 413-426: Merge the timestamp context block with a "Channel: Email" (or Chat, etc.) label using the existing `channelLabel` and `emoji` variables already in scope

**Result format:**
```text
┌──────────────────────────────────────────────────┐
│ 📧 New Email Conversation in Trønderdekk        │
│                                                  │
│ From:                       Subject:             │
│ joachim@example.com         Testing notifs       │
│                                                  │
│ > Full preview up to 300 chars now...            │
│                                                  │
│ 📧 Channel: Email     ⏰ 4/10/26, 10:53 PM      │
│                                                  │
│ [👀 View Conversation]                           │
└──────────────────────────────────────────────────┘
```

