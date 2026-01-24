

## Live Chat Enhancement Plan: Transfer, Customer Status, and Sound Notifications

### Overview
This plan implements three complementary features to enhance the agent live chat experience:
1. **Transfer Chat** - Allow agents to hand off active sessions to other team members
2. **Customer Online/Offline Status** - Show visitor connectivity status in the chat header
3. **Sound Notifications** - Alert agents when new customer messages arrive

---

## Feature 1: Transfer Chat

### Database Changes
None required - the `widget_chat_sessions.assigned_agent_id` field already supports reassignment.

### New Hook: `useChatSessionTransfer`

**File:** `src/hooks/useChatSessionTransfer.ts`

```typescript
export function useChatSessionTransfer(conversationId: string) {
  // 1. Fetch current session by conversation_id where status = 'active'
  // 2. Provide transferSession(newAgentId) function:
  //    - Update widget_chat_sessions.assigned_agent_id
  //    - Insert a system message: "Chat transferred from [Agent A] to [Agent B]"
  //    - Invalidate queries to refresh both agents' views
  // 3. Return { currentAssigneeId, transferSession, isTransferring }
}
```

### UI Changes

**File:** `src/components/conversations/ChatReplyInput.tsx`

Add a "Transfer Chat" button next to the "End Chat" button:

```tsx
// Add UserRoundPlus icon
import { UserRoundPlus } from 'lucide-react';

// Add transfer dialog state
const [transferDialogOpen, setTransferDialogOpen] = useState(false);
const { data: agents } = useAgents();
const { transferSession, isTransferring } = useChatSessionTransfer(conversationId);

// New Transfer button (between Send and End Chat):
<Button 
  size="icon" 
  variant="outline"
  className="rounded-full"
  onClick={() => setTransferDialogOpen(true)}
  title="Transfer chat"
>
  <UserRoundPlus className="h-4 w-4" />
</Button>

// Add Dialog for agent selection
<Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Transfer Chat</DialogTitle>
      <DialogDescription>
        Hand off this conversation to another team member.
      </DialogDescription>
    </DialogHeader>
    <Select onValueChange={(agentId) => transferSession(agentId)}>
      <SelectTrigger>
        <SelectValue placeholder="Select agent" />
      </SelectTrigger>
      <SelectContent>
        {agents?.filter(a => a.id !== currentAgentId).map(agent => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </DialogContent>
</Dialog>
```

### System Message on Transfer
When a transfer occurs, insert a special message:

```typescript
// In transferSession function
await supabase.from('messages').insert({
  conversation_id: conversationId,
  content: `Chat transferred from ${fromAgentName} to ${toAgentName}`,
  sender_type: 'agent',
  is_internal: false,
  content_type: 'text/plain',
  metadata: { type: 'system', subtype: 'transfer' }
});
```

---

## Feature 2: Customer Online/Offline Status

### New Hook: `useVisitorOnlineStatus`

**File:** `src/hooks/useVisitorOnlineStatus.ts`

```typescript
export function useVisitorOnlineStatus(conversationId: string | null) {
  // Query widget_chat_sessions for this conversation
  // Return { isOnline, lastSeenAt } based on last_seen_at timestamp
  // Consider "online" if last_seen_at < 30 seconds ago
  // Poll every 5 seconds to keep status current
  
  return useQuery({
    queryKey: ['visitor-online-status', conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('widget_chat_sessions')
        .select('last_seen_at, status')
        .eq('conversation_id', conversationId)
        .in('status', ['waiting', 'active'])
        .single();
      
      if (!data) return { isOnline: false, lastSeenAt: null };
      
      const lastSeen = new Date(data.last_seen_at);
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      const isOnline = lastSeen > thirtySecondsAgo && data.status === 'active';
      
      return { isOnline, lastSeenAt: data.last_seen_at };
    },
    refetchInterval: 5000, // Poll every 5s
    enabled: !!conversationId,
  });
}
```

### UI Changes

**File:** `src/components/conversations/ProgressiveMessagesList.tsx` (lines 294-302)

Update the chat header to show online/offline status:

```tsx
// Import the hook
import { useVisitorOnlineStatus } from '@/hooks/useVisitorOnlineStatus';

// In the component
const { data: onlineStatus } = useVisitorOnlineStatus(isLiveChat ? conversationId : null);

// Update the header (around line 295-301)
<div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
  {/* Status indicator - now dynamic */}
  <div className={cn(
    "w-2 h-2 rounded-full",
    onlineStatus?.isOnline 
      ? "bg-green-500 animate-pulse" 
      : "bg-gray-400"
  )} />
  <Globe className="h-4 w-4 text-muted-foreground" />
  <span className="text-sm font-medium">Live Chat</span>
  
  {/* Dynamic status badge */}
  <Badge 
    variant="outline" 
    className={cn(
      "ml-2 text-xs",
      onlineStatus?.isOnline 
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-gray-50 text-gray-600 border-gray-200"
    )}
  >
    {onlineStatus?.isOnline ? 'Online' : 'Offline'}
  </Badge>
  
  {/* Show last seen if offline */}
  {!onlineStatus?.isOnline && onlineStatus?.lastSeenAt && (
    <span className="text-xs text-muted-foreground">
      Last seen {formatDistanceToNow(new Date(onlineStatus.lastSeenAt), { addSuffix: true })}
    </span>
  )}
</div>
```

---

## Feature 3: Sound Notifications for New Customer Messages

### New Hook: `useChatMessageNotifications`

**File:** `src/hooks/useChatMessageNotifications.ts`

This hook adapts the existing `useCallNotifications` pattern for chat:

```typescript
interface ChatNotificationConfig {
  soundEnabled?: boolean;
  soundVolume?: number;
  enabled?: boolean;
}

export function useChatMessageNotifications(
  conversationId: string | null,
  config: ChatNotificationConfig = {}
) {
  const { soundEnabled = true, soundVolume = 0.5, enabled = true } = config;
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  
  // Initialize AudioContext on first interaction
  useEffect(() => {
    if (soundEnabled && !audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
    }
  }, [soundEnabled]);
  
  // Play a friendly "ding" sound
  const playMessageSound = useCallback(() => {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 880; // Higher pitch than calls
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(soundVolume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  }, [soundEnabled, soundVolume, audioContext]);
  
  return { playMessageSound };
}
```

### Integration into ProgressiveMessagesList

**File:** `src/components/conversations/ProgressiveMessagesList.tsx`

```tsx
// Import the hook
import { useChatMessageNotifications } from '@/hooks/useChatMessageNotifications';

// In the component, add:
const { playMessageSound } = useChatMessageNotifications(
  isLiveChat ? conversationId : null,
  { soundEnabled: true, soundVolume: 0.5 }
);
const prevMessageCountRef = useRef(messages.length);

// Play sound when new CUSTOMER message arrives
useEffect(() => {
  if (!isLiveChat) return;
  
  // Only check if message count increased
  if (messages.length > prevMessageCountRef.current) {
    // Check if the newest message is from customer
    const newestMessage = messages[messages.length - 1];
    if (newestMessage?.authorType === 'customer') {
      playMessageSound();
    }
  }
  prevMessageCountRef.current = messages.length;
}, [messages.length, isLiveChat, playMessageSound]);
```

### Settings Integration (Optional Enhancement)

The existing `NotificationSettings` component could be extended to include chat-specific settings, but for initial implementation, we'll use sensible defaults that match the widget experience.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useChatSessionTransfer.ts` | Transfer chat session between agents |
| `src/hooks/useVisitorOnlineStatus.ts` | Track visitor heartbeat/online status |
| `src/hooks/useChatMessageNotifications.ts` | Play sounds for new customer messages |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/conversations/ChatReplyInput.tsx` | Add Transfer button + dialog |
| `src/components/conversations/ProgressiveMessagesList.tsx` | Add online status indicator + sound notifications |

---

## Data Flow Diagrams

### Transfer Chat Flow

```
Agent A clicks "Transfer" → Dialog opens → Selects Agent B
           ↓
useChatSessionTransfer.transferSession(agentBId)
           ↓
UPDATE widget_chat_sessions SET assigned_agent_id = [Agent B]
           ↓
INSERT system message "Chat transferred..."
           ↓
Invalidate queries → Agent B sees chat in their queue
```

### Customer Online Status Flow

```
Widget sends ping every 30s → widget-chat API
           ↓
UPDATE widget_chat_sessions SET last_seen_at = NOW()
           ↓
useVisitorOnlineStatus polls every 5s
           ↓
Compare last_seen_at to current time
           ↓
If < 30s ago → "Online" (green dot)
If >= 30s ago → "Offline" (gray dot + last seen)
```

### Sound Notification Flow

```
Customer sends message → Widget → widget-chat API
           ↓
INSERT into messages table
           ↓
Agent's polling picks up new message
           ↓
useEffect detects new customer message
           ↓
playMessageSound() → Web Audio API beep
```

---

## Testing Plan

1. **Transfer Chat:**
   - Start a chat session, claim it, then transfer to another agent
   - Verify system message appears in conversation
   - Verify new agent can see and respond to chat
   - Verify original agent no longer sees active session

2. **Customer Online Status:**
   - Open chat with active visitor → should show green "Online"
   - Have visitor close tab → after 30s should show gray "Offline"
   - Check last seen timestamp appears correctly

3. **Sound Notifications:**
   - Have active chat open
   - Send message from widget
   - Verify sound plays in agent's browser
   - Verify no sound plays for agent's own messages

