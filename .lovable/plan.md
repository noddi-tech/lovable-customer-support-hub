

## Fix LIVE Badge Still Showing on Contact Form Conversations

### Root Cause

The `ConversationTableRow` component has **two render paths** — a virtualized div-based row and a standard `<TableRow>`. The previous fix only updated the virtualized path (line 249) to check `metadata.chatSessionStatus === 'active'`, but the standard table row path (line 352) still uses the old broken condition:

```
conversation.channel === 'widget' && conversation.status === 'open'
```

This means every open widget conversation (including contact forms) shows the blinking "LIVE" badge.

### Fix

**File: `src/components/dashboard/conversation-list/ConversationTableRow.tsx` (line 352)**

Change:
```
conversation.channel === 'widget' && conversation.status === 'open'
```
To:
```
conversation.channel === 'widget' && (conversation.metadata as any)?.chatSessionStatus === 'active'
```

This is a one-line fix that makes the standard table row match the already-fixed virtualized row logic. Contact form conversations have no `chatSessionStatus` in their metadata, so the LIVE badge will no longer appear for them.

