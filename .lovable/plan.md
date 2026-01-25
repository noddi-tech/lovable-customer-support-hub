

## Fix Plan: Customer Left Notification + Chat Navigation

### Overview
Two fixes needed:
1. **Customer left detection**: Alert the agent when the visitor ends/leaves the chat
2. **Chat navigation**: Fix claiming to stay in chat section, not navigate to text inbox

---

## Part 1: Detect and Display "Visitor Left" State

### 1.1 Update `useVisitorOnlineStatus` Hook

**File:** `src/hooks/useVisitorOnlineStatus.ts`

Expand the query to also check for `'ended'` and `'abandoned'` sessions:

```typescript
const { data, error } = await supabase
  .from('widget_chat_sessions')
  .select('last_seen_at, status')
  .eq('conversation_id', conversationId)
  .in('status', ['waiting', 'active', 'ended', 'abandoned'])  // Added ended/abandoned
  .maybeSingle();
```

Update the return type and logic:

```typescript
interface VisitorOnlineStatus {
  isOnline: boolean;
  lastSeenAt: string | null;
  status: 'waiting' | 'active' | 'ended' | 'abandoned' | null;
  hasLeft: boolean;  // NEW: true if visitor ended or abandoned
}

// In the query function:
const hasLeft = data.status === 'ended' || data.status === 'abandoned';

return { 
  isOnline: isOnline && !hasLeft,  // Can't be online if they left
  lastSeenAt: data.last_seen_at,
  status: data.status,
  hasLeft,  // NEW
};
```

---

### 1.2 Update Chat Header to Show "Visitor Left" Banner

**File:** `src/components/dashboard/conversation-view/ConversationViewContent.tsx`

Add a banner/alert when `onlineStatus?.hasLeft` is true:

```typescript
{/* Visitor left banner */}
{onlineStatus?.hasLeft && (
  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
    <AlertCircle className="h-4 w-4 text-amber-600" />
    <span className="text-sm text-amber-700 dark:text-amber-400">
      Visitor has left the chat
    </span>
    <span className="text-xs text-amber-600 dark:text-amber-500 ml-auto">
      {onlineStatus.status === 'abandoned' ? 'Timed out' : 'Ended by visitor'}
    </span>
  </div>
)}
```

Update the status badge to show "Left" instead of "Offline":

```typescript
<Badge variant="outline" className={cn(
  "text-xs shrink-0",
  onlineStatus?.hasLeft
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : onlineStatus?.isOnline 
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-gray-50 text-gray-600 border-gray-200"
)}>
  {onlineStatus?.hasLeft ? 'Left' : onlineStatus?.isOnline ? 'Online' : 'Offline'}
</Badge>
```

---

### 1.3 Optional: Toast Notification When Visitor Leaves

In `ConversationViewContent.tsx`, add a `useEffect` to detect status change:

```typescript
const previousStatusRef = useRef(onlineStatus?.status);

useEffect(() => {
  const prevStatus = previousStatusRef.current;
  const currentStatus = onlineStatus?.status;
  
  // Notify when status changes from active to ended/abandoned
  if (prevStatus === 'active' && (currentStatus === 'ended' || currentStatus === 'abandoned')) {
    toast.info('Visitor has left the chat', {
      description: currentStatus === 'abandoned' 
        ? 'Connection timed out' 
        : 'Visitor closed the chat',
    });
  }
  
  previousStatusRef.current = currentStatus;
}, [onlineStatus?.status]);
```

---

## Part 2: Fix Chat Claiming Navigation

### 2.1 Update Navigation Routes

**File:** `src/components/conversations/LiveChatQueue.tsx`

Change both navigation calls to use the chat route:

**Line 46 - After claiming:**
```typescript
// Before
navigate(`/interactions/text/open?c=${conversationId}`);

// After
navigate(`/interactions/chat/active?c=${conversationId}`);
```

**Line 51 - handleOpenConversation:**
```typescript
// Before
navigate(`/interactions/text/open?c=${conversationId}`);

// After
navigate(`/interactions/chat/active?c=${conversationId}`);
```

---

## Files Summary

| File | Changes |
|------|---------|
| `src/hooks/useVisitorOnlineStatus.ts` | Query ended/abandoned sessions, add `hasLeft` property |
| `src/components/dashboard/conversation-view/ConversationViewContent.tsx` | Add "Visitor left" banner, update status badge, optional toast |
| `src/components/conversations/LiveChatQueue.tsx` | Change navigation from `/interactions/text/` to `/interactions/chat/` |

---

## Expected Behavior After Fix

### Customer Leaves:
1. Visitor closes widget or times out
2. Session status changes to `'ended'` or `'abandoned'`
3. Agent sees:
   - Amber banner: "Visitor has left the chat"
   - Status badge changes to "Left" (amber color)
   - Toast notification appears (optional)
4. Chat remains in Active tab until agent clicks "End Chat"
5. Agent can still review the conversation and add notes

### Claiming a Chat:
1. Agent clicks "Claim" on waiting session
2. Toast: "Chat claimed"
3. Navigates to `/interactions/chat/active?c={id}` (stays in chat section)
4. Agent sees the chat UI immediately

