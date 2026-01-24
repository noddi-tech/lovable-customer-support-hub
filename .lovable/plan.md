
## Live Chat Enhancement Plan: Customer Typing Indicators for Agents

### Problem Summary
The agent chat UI exists but is missing the customer typing indicator feature. While visitors can see when agents are typing (via the widget), agents cannot see when customers are typing.

### Solution Overview
Create a hook to poll for visitor typing status and integrate it into the chat UI, while also wiring up agent typing to the input component.

---

### Part 1: Create `useVisitorTyping` Hook

**New File:** `src/hooks/useVisitorTyping.ts`

```typescript
export function useVisitorTyping(conversationId: string | null): { isTyping: boolean } {
  // Query chat_typing_indicators table where:
  // - conversation_id matches
  // - visitor_id IS NOT NULL (not an agent)
  // - is_typing = true
  // - updated_at within last 5 seconds (stale indicator check)
  
  // Poll every 2 seconds (same as message polling)
  // Return { isTyping: boolean }
}
```

**Implementation details:**
- Use `useQuery` with `refetchInterval: 2000`
- Query: `SELECT is_typing, updated_at FROM chat_typing_indicators WHERE conversation_id = ? AND visitor_id IS NOT NULL`
- Consider typing stale if `updated_at` > 5 seconds ago (prevents stuck indicators)

---

### Part 2: Update ProgressiveMessagesList to Pass Typing State

**File:** `src/components/conversations/ProgressiveMessagesList.tsx`

**Changes (around line 300-310):**
```tsx
// Import the new hook
import { useVisitorTyping } from '@/hooks/useVisitorTyping';

// Inside the component, before the isLiveChat check:
const { isTyping: customerTyping } = useVisitorTyping(isLiveChat ? conversationId : null);

// Update ChatMessagesList rendering:
<ChatMessagesList 
  messages={messages} 
  customerName={conversation?.customer?.full_name}
  customerEmail={conversation?.customer?.email}
  conversationId={conversationId}
  agentTyping={customerTyping}  // <-- Add this (prop name is confusing but matches existing interface)
/>
```

---

### Part 3: Rename Prop for Clarity (Optional but Recommended)

**File:** `src/components/conversations/ChatMessagesList.tsx`

**Change prop name for clarity:**
```tsx
interface ChatMessagesListProps {
  messages: NormalizedMessage[];
  customerName?: string;
  customerEmail?: string;
  customerTyping?: boolean;  // Renamed from agentTyping for clarity
  conversationId?: string;
}
```

This makes the code self-documenting - "customerTyping" clearly means "is the customer currently typing?"

---

### Part 4: Integrate Agent Typing into ChatReplyInput

**File:** `src/components/conversations/ChatReplyInput.tsx`

**Changes:**
```tsx
import { useAgentTyping } from '@/hooks/useAgentTyping';

// Inside component:
const { handleTyping, stopTyping } = useAgentTyping({ 
  conversationId,
  enabled: true 
});

// Update Input component:
<Input 
  placeholder="Type a message..." 
  value={message}
  onChange={(e) => {
    setMessage(e.target.value);
    handleTyping();  // <-- Trigger typing indicator
  }}
  onKeyDown={handleKeyDown}
  onBlur={stopTyping}  // <-- Clear when focus leaves
/>

// Also call stopTyping() in handleSend after successful send
```

---

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useVisitorTyping.ts` | **NEW** - Hook to poll visitor typing status |
| `src/components/conversations/ProgressiveMessagesList.tsx` | Add hook call, pass prop to ChatMessagesList |
| `src/components/conversations/ChatMessagesList.tsx` | Rename `agentTyping` to `customerTyping` for clarity |
| `src/components/conversations/ChatReplyInput.tsx` | Integrate `useAgentTyping` hook |

---

### Data Flow After Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER TYPING FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│  Widget Input → widget-chat API → chat_typing_indicators table  │
│                                           ↓                     │
│  useVisitorTyping (polls every 2s) ← chat_typing_indicators     │
│                     ↓                                           │
│  ProgressiveMessagesList → ChatMessagesList (shows indicator)   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     AGENT TYPING FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│  ChatReplyInput.onChange → useAgentTyping.handleTyping()        │
│                     ↓                                           │
│  chat_typing_indicators table (upsert with user_id)             │
│                     ↓                                           │
│  widget-chat API (polls) → Widget LiveChat (shows indicator)    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Expected Behavior

1. **When customer types in widget:**
   - Widget sends typing status via `widget-chat` API
   - Agent UI polls `chat_typing_indicators` every 2s
   - Bouncing dots appear under customer's avatar in agent chat view

2. **When agent types in chat input:**
   - `useAgentTyping` hook writes to `chat_typing_indicators`
   - Widget polls for agent typing (already implemented)
   - Customer sees bouncing dots indicator

3. **Stale indicator prevention:**
   - Indicators auto-clear after 3-5 seconds of no updates
   - Prevents "stuck" typing indicators if connection drops

---

### No Database Changes Required

The `chat_typing_indicators` table already supports both agent (`user_id`) and visitor (`visitor_id`) typing tracking with proper constraints.
