

## Fix Plan: Widget Agent Attribution + Always-Visible Noddi Panel

### Overview
Two issues to fix:
1. Agent messages in chat show "Noddi Support" instead of the actual agent's name (e.g., "JR")
2. The Noddi customer details panel is hidden when no customer is found in Noddi

---

## Issue 1: Show Actual Agent Name in Widget Messages

### Root Cause
When agents send messages through the chat interface, the `sender_id` should be set to the agent's auth user ID. However, the normalization logic falls back to "Noddi Support" (the inbox display name) when:
1. `sender_id` is missing, OR
2. `sender_profile` lookup returns no results

### Solution
Update `ChatReplyInput.tsx` to ensure the `sender_id` is correctly set when inserting agent messages. The chat reply already uses `auth.uid()` for message insertion, but we need to verify the message query correctly joins the profile.

### Files to Modify

**1. `src/components/conversations/ChatReplyInput.tsx`**
- Verify the message insert includes `sender_id: user.id` 
- Ensure `sender_type: 'agent'` is set

**2. `src/lib/normalizeMessage.ts`**
- Improve agent fallback: If `sender_profile` exists, ALWAYS use its `full_name` even if `authorLabel` was set from headers
- Current issue: The fallback logic on lines 383-392 only runs when `authorLabel` is empty

### Code Change (normalizeMessage.ts lines 383-392)

```typescript
} else if (authorType === 'agent') {
  // For agents: ALWAYS prefer profile data if available
  if (senderProfile) {
    // Override any header-derived name with the actual profile name
    fromName = senderProfile.full_name || fromName;
    fromEmail = senderProfile.email || fromEmail;
    authorLabel = senderProfile.full_name || senderProfile.email || authorLabel || 'Agent';
  } else {
    // Only fall back to inbox email if no profile exists
    fromEmail = fromEmail ?? ctx.inboxEmail?.toLowerCase() ?? ctx.currentUserEmail?.toLowerCase();
    authorLabel = authorLabel || fromName || fromEmail || 'Agent';
  }
}
```

**Also check**: The `ChatReplyInput` message insertion to confirm `sender_id` is included:
```typescript
const { error: insertError } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    content: messageContent,
    sender_type: 'agent',
    sender_id: user.id,  // <-- Critical: must be present
    content_type: 'text/plain',
    // ...
  });
```

---

## Issue 2: Always Show Noddi Panel (Even When Customer Not Found)

### Root Cause
The Info button is conditionally rendered only when `noddiData?.data?.found` is true:
```typescript
{noddiData?.data?.found && (
  <Button onClick={() => setShowNoddiPanel(!showNoddiPanel)}>
    <Info className="h-4 w-4" />
  </Button>
)}
```

### Solution
Always show the Noddi panel access button. The `NoddihKundeData` component already handles "not found" states gracefully with appropriate UI.

### Files to Modify

**1. `src/components/dashboard/conversation-view/ConversationViewContent.tsx`**

Change the conditional rendering of the Info button (around line 208-219):

**Before:**
```typescript
{noddiData?.data?.found && (
  <Button 
    variant={showNoddiPanel ? "secondary" : "ghost"}
    size="icon"
    onClick={() => setShowNoddiPanel(!showNoddiPanel)}
    title="View Noddi customer info"
  >
    <Info className="h-4 w-4" />
  </Button>
)}
```

**After:**
```typescript
{/* Always show Noddi info button - component handles not-found state */}
<Button 
  variant={showNoddiPanel ? "secondary" : "ghost"}
  size="icon"
  onClick={() => setShowNoddiPanel(!showNoddiPanel)}
  title="View Noddi customer info"
  className="shrink-0"
>
  <Info className="h-4 w-4" />
  {/* Show indicator dot if customer found in Noddi */}
  {noddiData?.data?.found && (
    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
  )}
</Button>
```

**Also update the panel rendering (around line 241):**

**Before:**
```typescript
{showNoddiPanel && noddiData?.data?.found && (
  <div className="w-80 border-l ...">
    <NoddihKundeData customer={conversation.customer} />
  </div>
)}
```

**After:**
```typescript
{showNoddiPanel && (
  <div className="w-80 border-l flex-shrink-0 overflow-auto bg-background">
    <div className="flex items-center justify-between p-3 border-b">
      <span className="font-medium text-sm">Customer Details</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNoddiPanel(false)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
    <NoddihKundeData customer={conversation.customer} />
  </div>
)}
```

---

## Files Summary

| File | Changes |
|------|---------|
| `src/lib/normalizeMessage.ts` | Always prefer `sender_profile.full_name` for agent attribution |
| `src/components/conversations/ChatReplyInput.tsx` | Verify `sender_id` is set on message insert |
| `src/components/dashboard/conversation-view/ConversationViewContent.tsx` | Always show Noddi panel button, add green dot indicator when found |

---

## Expected Results

1. **Agent messages** - Will show actual agent name (e.g., "John Doe" or "JR" initials) instead of "Noddi Support"
2. **Noddi panel** - Always accessible via Info button in chat header; green dot indicates if customer is recognized
3. **Not-found state** - When customer isn't in Noddi, the panel still shows but with "Customer not found in Noddi" message (already handled by `NoddihKundeData` component)

---

## Testing Plan

1. Open a chat conversation
2. Click the Info button - Noddi panel should slide open
3. If customer not in Noddi, should show "not found" state
4. If customer in Noddi, should show booking/order details
5. Send a message as agent - should show YOUR name, not "Noddi Support"
6. Check initials match agent's actual name

