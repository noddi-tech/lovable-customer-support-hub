
## Comprehensive Plan: Dedicated Chat Menu Under Interactions

### Overview
This plan separates Chat functionality from Text Messages (Email) into its own dedicated menu item under Interactions. The Chat section will have a purpose-built UI for real-time messaging, while Text Messages remains optimized for email workflows. Key enhancements include showing specific online agent names and integrating Noddi API for customer lookup in chat.

---

## Part 1: Navigation and Routing Changes

### 1.1 Add Chat Route in App.tsx
**File:** `src/App.tsx`

Add new route for `/interactions/chat`:
```typescript
// Around line 122-126, add:
<Route path="/interactions/chat" element={<Navigate to="/interactions/chat/active" replace />} />
<Route path="/interactions/chat/:filter" element={<ProtectedRoute><Index /></ProtectedRoute>} />
```

### 1.2 Update InteractionsSidebar
**File:** `src/components/layout/InteractionsSidebar.tsx`

Add "Chat" item to `interactionItems` array between Text Messages and Voice Calls:
```typescript
const interactionItems = [
  {
    title: 'Text Messages',
    icon: MessageSquare,
    path: '/interactions/text',
    badge: emailCount  // Will need to add dynamic count
  },
  {
    title: 'Chat',          // NEW
    icon: MessageCircle,    // Different icon for chat
    path: '/interactions/chat',
    badge: activeChatCount  // Live chat count
  },
  {
    title: 'Voice Calls',
    icon: Phone,
    path: '/interactions/voice',
    badge: '5'
  }
];
```

### 1.3 Update Index.tsx Route Handling
**File:** `src/pages/Index.tsx`

Add detection for chat sub-section:
```typescript
// In getCurrentSubSection():
if (path.includes('/interactions/chat')) return 'chat';

// In renderContent():
if (subSection === 'chat') {
  return <ChatLayout />;  // New dedicated chat layout
}
```

### 1.4 Update nav-config.ts
**File:** `src/navigation/nav-config.ts`

Add chat navigation item:
```typescript
{ 
  id: "chat", 
  label: "Chat", 
  to: "/interactions/chat", 
  icon: MessageCircle, 
  group: "interactions" 
},
```

---

## Part 2: Dedicated Chat Layout Component

### 2.1 Create ChatLayout.tsx
**File:** `src/components/dashboard/ChatLayout.tsx` (NEW)

A dedicated layout for chat that includes:
1. **Sidebar with chat-specific filters** (Active, Waiting, Ended, All)
2. **LiveChatQueue integration** - moved from email view
3. **Chat-only conversation list** - filtered to `channel='widget'`
4. **WhatsApp-style conversation view** - reuses existing streamlined UI

```typescript
// Structure:
<MasterDetailShell>
  {/* Left: Chat sidebar + list */}
  <div className="flex flex-col h-full">
    {/* Chat filters: Active | Waiting | Ended | All */}
    <ChatFilters />
    
    {/* Live Chat Queue - prominent position */}
    <LiveChatQueue className="mb-4" />
    
    {/* Chat list - only widget channel conversations */}
    <ChatConversationList 
      filter={currentFilter} 
      onSelectChat={handleSelectChat}
    />
  </div>
  
  {/* Right: Selected chat view */}
  {selectedChatId ? (
    <ChatConversationView conversationId={selectedChatId} />
  ) : (
    <EmptyChatState />
  )}
</MasterDetailShell>
```

### 2.2 Create ChatConversationList.tsx
**File:** `src/components/dashboard/ChatConversationList.tsx` (NEW)

A list component that:
1. Fetches only `channel='widget'` conversations
2. Shows visitor name, email, online status
3. Displays time waiting/last message
4. Highlights active sessions with green indicator
5. Shows Noddi customer badge if recognized

### 2.3 Modify Conversation Filtering
**File:** `src/data/interactions.ts`

Update `applyFilters` to accept `channel` parameter:
```typescript
function applyFilters(conversations: ConversationRow[], params: {
  // ... existing params
  channel?: 'widget' | 'email' | 'all';  // NEW
}): ConversationRow[] {
  let filtered = conversations;
  
  // Apply channel filter
  if (params.channel && params.channel !== 'all') {
    if (params.channel === 'widget') {
      filtered = filtered.filter(c => c.channel === 'widget');
    } else if (params.channel === 'email') {
      // Filter OUT widget conversations for email view
      filtered = filtered.filter(c => c.channel !== 'widget');
    }
  }
  // ... rest of existing filters
}
```

### 2.4 Update Text Messages View
**File:** `src/components/dashboard/EnhancedInteractionsLayout.tsx`

Modify to exclude widget/chat conversations:
```typescript
// When fetching conversations for Text Messages:
// Add channel: 'email' filter to exclude widget conversations
```

This ensures Text Messages shows only email conversations.

---

## Part 3: Show Specific Online Agents

### 3.1 Create useOnlineAgents Hook
**File:** `src/hooks/useOnlineAgents.ts` (NEW)

Replace count-only approach with full agent list:
```typescript
interface OnlineAgent {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  chat_availability: 'online' | 'away' | 'offline';
}

export function useOnlineAgents(organizationId: string | null) {
  return useQuery({
    queryKey: ['online-agents', organizationId],
    queryFn: async (): Promise<OnlineAgent[]> => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          avatar_url,
          chat_availability
        `)
        .in('chat_availability', ['online', 'away'])
        .eq('organization_id', organizationId)
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    refetchInterval: 15000, // Poll every 15 seconds
  });
}
```

### 3.2 Update AgentStatusToggle Display
**File:** `src/components/layout/AgentStatusToggle.tsx`

Replace "1 other agent online" with actual names:
```typescript
// Instead of:
// "{otherOnlineAgents} other agent{s} online"

// Show:
{onlineAgents.length > 0 && (
  <div className="mt-1 px-2">
    <p className="text-xs text-muted-foreground mb-1">Online now:</p>
    <div className="flex flex-wrap gap-1">
      {onlineAgents.slice(0, 3).map(agent => (
        <div key={agent.id} className="flex items-center gap-1">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px]">
              {getInitials(agent.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs">{agent.full_name.split(' ')[0]}</span>
        </div>
      ))}
      {onlineAgents.length > 3 && (
        <span className="text-xs text-muted-foreground">
          +{onlineAgents.length - 3} more
        </span>
      )}
    </div>
  </div>
)}
```

---

## Part 4: Noddi API Integration for Chat

### 4.1 Enhance Chat View with Noddi Lookup
The existing `ConversationViewContent.tsx` already uses `useNoddihKundeData` for widget conversations (line 102). The customer display with Noddi already works.

**Enhancement for ChatConversationList:**
When rendering each chat session, pass the visitor email to create a customer object for Noddi lookup:
```typescript
// In ChatConversationList.tsx
const customerForNoddi = useMemo(() => ({
  id: session.conversationId,
  email: session.visitorEmail,
  phone: null,  // Widget typically has email, not phone
  full_name: session.visitorName,
}), [session]);

const { data: noddiData } = useNoddihKundeData(customerForNoddi);

// Display Noddi badge if customer found
{noddiData?.data?.found && (
  <Badge variant="secondary" className="text-xs">
    Noddi Customer
  </Badge>
)}
```

### 4.2 Add Noddi Side Panel for Chat (Optional Enhancement)
For the streamlined chat view, add a collapsible right panel that shows Noddi customer data when available:
```typescript
// In ChatConversationView, add optional side panel toggle
{noddiData?.data?.found && (
  <Button 
    variant="ghost" 
    size="sm"
    onClick={() => setShowNoddiPanel(!showNoddiPanel)}
  >
    <Info className="h-4 w-4" />
  </Button>
)}

// Collapsible Noddi panel
{showNoddiPanel && (
  <div className="w-80 border-l p-4">
    <NoddihKundeData customer={customer} />
  </div>
)}
```

---

## Part 5: File Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/dashboard/ChatLayout.tsx` | Main chat layout with sidebar and content |
| `src/components/dashboard/ChatConversationList.tsx` | List of chat-only conversations |
| `src/components/dashboard/ChatFilters.tsx` | Chat-specific filter tabs (Active, Waiting, Ended) |
| `src/hooks/useOnlineAgents.ts` | Fetch list of online agents with names |

### Files to Modify
| File | Change |
|------|--------|
| `src/App.tsx` | Add `/interactions/chat` routes |
| `src/pages/Index.tsx` | Add 'chat' sub-section detection and render ChatLayout |
| `src/components/layout/InteractionsSidebar.tsx` | Add Chat menu item with MessageCircle icon |
| `src/navigation/nav-config.ts` | Add chat navigation config |
| `src/data/interactions.ts` | Add `channel` filter to `applyFilters` |
| `src/components/dashboard/EnhancedInteractionsLayout.tsx` | Filter to exclude widget conversations |
| `src/components/layout/AgentStatusToggle.tsx` | Show individual online agent names |

---

## Visual Architecture

```
Interactions (Sidebar)
├── Text Messages     → /interactions/text     → EnhancedInteractionsLayout (emails only)
├── Chat             → /interactions/chat     → ChatLayout (widget only)  ← NEW
└── Voice Calls      → /interactions/voice    → VoiceDashboard
```

### Chat Layout Structure
```
┌─────────────────────────────────────────────────────────────────┐
│ Chat Filters: [Active] [Waiting] [Ended] [All]                   │
├───────────────────────┬─────────────────────────────────────────┤
│ Live Chat Queue       │                                         │
│ ┌───────────────────┐ │  Compact Chat Header                    │
│ │ 2 waiting         │ │  ┌─────────────────────────────────────┐│
│ └───────────────────┘ │  │ ← [Avatar] John Doe ● Online       ││
│                       │  │   john@email.com                    ││
│ Chat List             │  └─────────────────────────────────────┘│
│ ┌───────────────────┐ │                                         │
│ │ Jane - Active     │ │  Chat Bubbles (WhatsApp style)          │
│ │ · Last msg...     │ │  ┌─────────────────────────────────────┐│
│ ├───────────────────┤ │  │                    [Customer bubble]││
│ │ Bob - Waiting 2m  │ │  │ [Agent bubble]                      ││
│ │ Claim             │ │  │                    [Customer bubble]││
│ └───────────────────┘ │  └─────────────────────────────────────┘│
│                       │                                         │
│                       │  [Message input] [Send] [Transfer] [End]│
└───────────────────────┴─────────────────────────────────────────┘
```

---

## Testing Plan

1. **Navigation**: Click "Chat" in sidebar → should navigate to `/interactions/chat/active`
2. **Separation**: Text Messages should NOT show widget conversations
3. **Chat List**: Should only show `channel='widget'` conversations
4. **Online Agents**: AgentStatusToggle should show "Sarah, Mike, +1 more" instead of "3 agents online"
5. **Noddi Integration**: Chat sessions with recognized emails should show Noddi badge
6. **Live Queue**: LiveChatQueue should appear in Chat section (removed from Text Messages)
7. **Claim Flow**: Claiming a chat should navigate to `/interactions/chat/active?c={id}`
8. **Chat UI**: Opening a chat should show WhatsApp-style UI (no email components)

---

## Benefits

1. **Clear Separation**: Email and Chat have distinct homes with purpose-built UIs
2. **Faster Context Switching**: Agents can focus on real-time chat without email clutter
3. **Better Agent Visibility**: See exactly who is online, not just a count
4. **Customer Recognition**: Noddi lookup works in chat for instant customer identification
5. **Preserved Email UX**: Text Messages continues working exactly as before
