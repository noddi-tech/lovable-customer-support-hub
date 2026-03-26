

## Complete Mobile UX Overhaul -- Surgical Plan

### Problems Identified

1. **Sidebar inaccessible**: The `SidebarTrigger` was removed from `UnifiedAppLayout.tsx` in the last iteration. The sidebar renders as a Sheet on mobile (via shadcn's `Sidebar` component with `collapsible="icon"`), but there is no button anywhere to call `toggleSidebar()` / `setOpenMobile(true)`. The conversation list header and conversation view header both lack a trigger.

2. **Chat (Beate Berntsen) shows no customer content**: The `ChatMessagesList` renders `message.visibleBody` via `EmailRender`. The issue is that the chat bubbles use `chat-bubble-content` CSS class but have no `overflow-hidden` or `max-width` constraint -- wide HTML content or the `EmailRender` iframe can overflow or render as blank. The chat bubble `max-w-[85%]` is applied on the outer `div`, but the inner content has no width constraint.

3. **Email view has excessive scroll / looks terrible**: The `MessageCard` expanded content uses `max-h-[60vh] overflow-y-auto` but on mobile this creates a scroll-within-scroll. Combined with `pl-4 md:pl-16 pr-4` padding and the email-render having no width cap, HTML emails overflow horizontally. The conversation header + subject block also takes significant vertical space.

4. **Second screenshot shows empty white screen**: This is the chat conversation (Beate Berntsen) where `EmailRender` renders a blank iframe or the content is empty. The `visibleBody` might be empty for the customer's message if it was a widget chat message with content in a different field.

### Plan -- 8 Surgical Changes, Mobile-Only

#### 1. Add SidebarTrigger to ConversationListHeader (mobile)
**File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`**

Import `SidebarTrigger` from `@/components/ui/sidebar`. Add it as the first element in the header row on mobile, before the "New" button. This gives sidebar access from the inbox list.

```
// At line ~93, inside the flex row, before NewConversationDialog:
{isMobile && <SidebarTrigger className="shrink-0" />}
```

#### 2. Add SidebarTrigger to ConversationViewContent headers (mobile)
**File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx`**

Add `SidebarTrigger` next to the back button in both the email header (line ~352) and chat header (line ~185) on mobile. Import from sidebar.

```
// Chat header, after the ArrowLeft button:
{isMobile && <SidebarTrigger className="shrink-0" />}

// Email header, after the ArrowLeft button:  
{isMobile && <SidebarTrigger className="shrink-0" />}
```

#### 3. Fix chat message content rendering on mobile
**File: `src/components/conversations/ChatMessagesList.tsx`**

The chat bubble has no width constraint on content. Add `overflow-hidden max-w-full` to the bubble div and `[&_img]:max-w-full` to prevent images from breaking layout. Also ensure `word-break: break-word` is applied.

Change the bubble div (line ~262):
```tsx
<div className={cn(
  "px-4 py-3 rounded-2xl text-sm leading-relaxed break-words chat-bubble-content overflow-hidden max-w-[280px] md:max-w-md",
  // ... existing conditional classes
)}>
```

#### 4. Fix email MessageCard mobile layout
**File: `src/components/conversations/MessageCard.tsx`**

Three changes:
- **Remove nested scroll**: Change `max-h-[60vh] md:max-h-none overflow-y-auto` to just `md:max-h-none` -- don't constrain height on mobile, let the outer ScrollArea handle it. The scroll-within-scroll is worse than a long page.
- **Reduce padding on mobile**: Change expanded content `pl-4 md:pl-16 pr-4 pb-4` to `pl-2 pr-2 pb-3 md:pl-16 md:pr-4 md:pb-4`
- **Add overflow containment**: Add `overflow-hidden` to the content wrapper

Line ~552-556:
```tsx
<div className={cn(
  "message-content",
  effectiveCollapsed ? "is-collapsed" : "pl-2 pr-2 pb-3 md:pl-16 md:pr-4 md:pb-4"
)}>
  <div className="space-y-4 overflow-hidden">
```

Also reduce header padding on mobile (line ~331):
```tsx
"px-2 md:px-4",
```

#### 5. Fix email-render overflow on mobile  
**File: `src/components/ui/email-render.tsx`**

Find the main HTML render container and ensure it has `overflow-x-auto max-w-full` and `[&_table]:max-w-full [&_img]:max-w-full [&_img]:h-auto` so wide HTML emails and images are contained within the card width instead of overflowing the viewport.

#### 6. Simplify ProgressiveMessagesList for mobile
**File: `src/components/conversations/ProgressiveMessagesList.tsx`**

- Remove all horizontal padding on mobile: change `px-1 md:px-2` to `px-0 md:px-2`
- The timeline rail is already `hidden md:block` (good)
- The "Jump to latest" button at `fixed bottom-8 right-8` should use `bottom-20` on mobile to avoid overlapping reply buttons: `bottom-20 right-4 md:bottom-8 md:right-8`

#### 7. Fix ChatReplyInput for mobile
**File: `src/components/conversations/ChatReplyInput.tsx`**

Check if the chat reply input has proper mobile width constraints. It should use `w-full` and the input area should not overflow.

#### 8. Fix ReplyArea mobile layout
**File: `src/components/dashboard/conversation-view/ReplyArea.tsx`**

The controls row (line ~363) with AI Suggest, Translate, Attach, Template buttons overflows on mobile. Hide text labels (already done with `!isMobile`) but the row itself needs `overflow-x-auto` or `flex-wrap`:

Change line ~397:
```tsx
<div className="flex items-center gap-1 md:gap-2 flex-wrap">
```

The send button area (line ~617) also needs tighter layout on mobile. The `flex-wrap` is already there, but we should make the Send button full-width on mobile when there are no other inline controls:

```tsx
{isMobile && (
  <Button onClick={handleSendReply} ... className="w-full gap-2">
```

### Technical Details

| File | Change | Lines |
|------|--------|-------|
| `ConversationListHeader.tsx` | Add `SidebarTrigger` on mobile before New button | ~93 |
| `ConversationViewContent.tsx` | Add `SidebarTrigger` in both chat + email headers on mobile | ~185, ~352 |
| `ChatMessagesList.tsx` | Constrain bubble width, add overflow-hidden | ~262 |
| `MessageCard.tsx` | Remove nested scroll, reduce mobile padding, add overflow-hidden | ~331, ~552-556 |
| `email-render.tsx` | Add overflow/width constraints to HTML render container | TBD |
| `ProgressiveMessagesList.tsx` | Remove mobile padding, fix jump-to-latest position | ~388, ~425 |
| `ReplyArea.tsx` | Wrap controls row, full-width send on mobile | ~397, ~617 |

7 files modified. No new dependencies. No database changes. Desktop layout untouched -- all changes use `isMobile` checks or responsive Tailwind (`md:` prefix).

