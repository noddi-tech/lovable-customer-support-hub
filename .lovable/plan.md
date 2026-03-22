

## Fix: "Send & Keep Open" Bug + Status Dropdown in Chat Header

### Root Cause 1: "Send & Keep Open" doesn't work in chat

`ChatReplyInput.tsx` line 166 has `if (replyStatus !== 'open')` — when agent picks "Send & Keep Open", the status update is **skipped entirely**. If the conversation was already closed, it stays closed.

Worse: ChatReplyInput manages its own status update (lines 166-182) instead of using the shared `sendReply` from `ConversationViewContext`, which already handles status updates correctly (line 429: `if (!isInternal && status)`). This means there are **two competing status-update paths**.

**Fix in `src/components/conversations/ChatReplyInput.tsx`**:
- Remove the `if (replyStatus !== 'open')` guard — always update status to whatever the agent selected
- This means: if agent picks "open", explicitly set `status = 'open'` in the DB (which reopens a closed conversation)

### Root Cause 2: No way to change status from chat header

The email view header (`ConversationHeader.tsx`) has a `<Select>` dropdown for status (open/pending/closed). The chat header (`ConversationViewContent.tsx` lines 178-260) has no equivalent — agents cannot reopen a closed chat conversation without sending a message.

**Fix in `src/components/dashboard/conversation-view/ConversationViewContent.tsx`**:
- Add a compact status `<Select>` dropdown in the chat header, between the online badge and the Noddi info button
- Use `updateStatus` from `useConversationView()` — already available in this component
- Same options as email header: Open, Pending, Closed

### Changes

| File | What |
|------|------|
| `ChatReplyInput.tsx` | Remove `if (replyStatus !== 'open')` guard on line 166 — always update status |
| `ConversationViewContent.tsx` | Add status `<Select>` dropdown in chat header (after online badge, before Noddi button) |

