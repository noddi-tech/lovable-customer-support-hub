

## Comprehensive Fix Plan: Chat UI + Noddi Integration

### Root Cause Identified

The chat UI is showing email style because **`useConversationMeta.ts` doesn't fetch the `channel` field** from the `conversations` table. This causes `conversation.channel` to always be `undefined`, making `isLiveChat = false` for all conversations.

**Database confirmation**: The conversation `bbc1f6ed-...` does have `channel: 'widget'` in the database, so the data is correct - it's just not being fetched.

---

## Part 1: Fix the Channel Detection (Critical Bug Fix)

**File:** `src/hooks/conversations/useConversationMeta.ts`

Add `channel` to the select query:

```typescript
// Line 36-48: Add 'channel' to the select
const { data: conversation, error: convError } = await supabase
  .from('conversations')
  .select(`
    id,
    subject,
    status,
    priority,
    is_read,
    updated_at,
    channel,  // ADD THIS LINE
    customer:customers(id, full_name, email, phone, metadata)
  `)
  .eq('id', conversationId)
  .single();
```

Also add `channel` to the `ConversationMeta` interface and return object.

---

## Part 2: Add Noddi Details Panel to Chat View

Based on your selection, implement a **collapsible right-side panel** showing full Noddi customer data.

**File:** `src/components/dashboard/conversation-view/ConversationViewContent.tsx`

Add collapsible Noddi panel to the live chat UI (lines 142-232):

```typescript
// State for panel visibility
const [showNoddiPanel, setShowNoddiPanel] = useState(false);

// In the compact chat header, add info button
{noddiData?.data?.found && (
  <Button 
    variant="ghost" 
    size="icon"
    onClick={() => setShowNoddiPanel(!showNoddiPanel)}
    title="View Noddi customer info"
  >
    <Info className="h-4 w-4" />
  </Button>
)}

// Collapsible right panel
{showNoddiPanel && noddiData?.data?.found && (
  <div className="w-80 border-l flex-shrink-0 overflow-auto">
    <NoddihKundeData customer={conversation.customer} />
  </div>
)}
```

---

## Part 3: Enhanced Chat UI (ShadcnUI Kit Style)

### 3.1 Update Chat List Item Styling

**File:** `src/components/dashboard/chat/ChatListItem.tsx`

Add delivery status checkmarks and unread count badges:

```typescript
// Add message status indicator (single check for sent, double for delivered)
{conv.is_read && (
  <span className="text-green-500">
    <CheckCheck className="h-3 w-3" />
  </span>
)}
{!conv.is_read && (
  <span className="text-muted-foreground">
    <Check className="h-3 w-3" />
  </span>
)}

// Add unread count badge (green circle with number)
{unreadCount > 0 && (
  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
    {unreadCount}
  </span>
)}
```

### 3.2 Add Message Actions Menu

**File:** `src/components/conversations/ChatMessagesList.tsx`

Add hover action menu (•••) to each message bubble:

```typescript
// Around the message bubble, add hover-visible action menu
<div className="group relative">
  {/* Action menu - visible on hover */}
  <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Copy</DropdownMenuItem>
        <DropdownMenuItem>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  
  {/* Message bubble */}
  <div className="px-4 py-3 rounded-2xl...">
    {message.visibleBody}
  </div>
</div>
```

### 3.3 Enhanced Chat Input with Icons

**File:** `src/components/conversations/ChatReplyInput.tsx`

Add emoji picker, attachment button, and mic icon (placeholder):

```typescript
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

// State for emoji picker
const [showEmojiPicker, setShowEmojiPicker] = useState(false);

// Updated input layout
<div className="flex items-center gap-2 p-4 border-t border-border bg-background">
  {/* Emoji picker button + popover */}
  <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" className="shrink-0">
        <Smile className="h-5 w-5 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent side="top" className="w-auto p-0">
      <Picker 
        data={data} 
        onEmojiSelect={(emoji) => {
          setMessage(prev => prev + emoji.native);
          setShowEmojiPicker(false);
        }}
      />
    </PopoverContent>
  </Popover>

  {/* Attachment button (functional) */}
  <Button variant="ghost" size="icon" className="shrink-0">
    <Paperclip className="h-5 w-5 text-muted-foreground" />
  </Button>

  {/* Message input */}
  <Input 
    placeholder="Enter message..." 
    className="flex-1 rounded-full"
    value={message}
    onChange={handleInputChange}
    onKeyDown={handleKeyDown}
  />

  {/* Mic button (placeholder) */}
  <Button variant="ghost" size="icon" className="shrink-0" disabled>
    <Mic className="h-5 w-5 text-muted-foreground" />
  </Button>

  {/* Send button */}
  <Button size="icon" className="rounded-full" onClick={handleSend}>
    <Send className="h-4 w-4" />
  </Button>
</div>
```

### 3.4 File Attachments Implementation

Since you want attachments to work:

1. **Create storage bucket** for chat attachments (SQL migration)
2. **Add upload handler** in ChatReplyInput
3. **Display attachments** in ChatMessagesList (images inline, files as download links)

```sql
-- Create chat attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false);

-- RLS policy for authenticated uploads
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- RLS policy for reading attachments
CREATE POLICY "Users can view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');
```

---

## Part 4: Header Keeps Back Button

Per your preference, the Back button will remain visible on all screen sizes (including desktop).

---

## Files Summary

| File | Changes |
|------|---------|
| `src/hooks/conversations/useConversationMeta.ts` | **Add `channel` to select query** (critical fix) |
| `src/components/dashboard/conversation-view/ConversationViewContent.tsx` | Add collapsible Noddi panel to chat UI |
| `src/components/dashboard/chat/ChatListItem.tsx` | Add checkmarks, unread badges |
| `src/components/conversations/ChatMessagesList.tsx` | Add message action menus, delivery status |
| `src/components/conversations/ChatReplyInput.tsx` | Add emoji picker, attachment/mic icons |
| Database migration | Create `chat-attachments` storage bucket |

---

## Testing Plan

1. Navigate to `/interactions/chat/active` and click a chat
2. **Verify chat UI** - Should show bubbles, not email cards
3. **Verify Noddi panel** - Click info icon in header, panel should slide out with full customer data
4. **Test emoji picker** - Click smile icon, select emoji, verify it inserts
5. **Test attachment** - Click paperclip, upload file, verify it sends and displays
6. **Verify Back button** - Should be visible on both mobile and desktop

---

## Implementation Order

1. Fix `useConversationMeta.ts` first (this unblocks the chat UI)
2. Add Noddi details panel
3. Enhance input with emoji picker + icons
4. Add message action menus
5. Implement attachment upload/display
6. Add checkmarks and unread badges

