

## Make Mobile Experience Usable: Scrolling, Overflow, and Sidebar Access

### Problems Identified

1. **No way to open sidebar on mobile**: The `Sidebar` component already renders as a Sheet on mobile (built into shadcn), but there's no `SidebarTrigger` button visible anywhere in the mobile layout. The sidebar is completely inaccessible.

2. **Conversation list not scrollable on mobile**: The `ConversationList` container uses `overflow-hidden` but the virtualized table has a hardcoded `height: calc(100vh - 200px)` which doesn't account for the mobile layout. The `VirtualizedConversationTable` also has fixed column widths that cause horizontal overflow.

3. **Email/chat view has horizontal overflow**: The `ProgressiveMessagesList` content column uses `max-w-5xl` (~1024px) which overflows on mobile. The `EmailRender` component has no overflow constraints, so wide HTML emails break the layout. The conversation view header (`ConversationViewContent`) has elements that overflow on narrow screens.

4. **"Back to Inbox" header takes space but sidebar trigger is missing**: On mobile conversation view, there's a back button but no hamburger menu to access main navigation.

### Changes

#### 1. Add SidebarTrigger to mobile layout
**File: `src/components/layout/UnifiedAppLayout.tsx`**
- Import `SidebarTrigger` from sidebar component
- Add a fixed/sticky trigger button visible only on mobile (`md:hidden`) at the top-left or as a floating button
- This lets users open the main nav drawer on mobile

#### 2. Add SidebarTrigger to conversation list header on mobile
**File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`**
- Add a hamburger/menu `SidebarTrigger` as the first element on mobile, before the "New" button
- This gives sidebar access from the inbox view

#### 3. Fix conversation view overflow on mobile
**File: `src/components/conversations/ProgressiveMessagesList.tsx`**
- Change the content column from `max-w-5xl` to responsive: `max-w-full md:max-w-5xl`
- Reduce horizontal padding on mobile: `px-1 md:px-2`

#### 4. Add overflow containment to email rendering
**File: `src/components/ui/email-render.tsx`**
- Add `overflow-x-auto` and `max-w-full` to the email content wrapper so wide HTML emails scroll horizontally within their card rather than breaking the page layout

#### 5. Fix conversation view header overflow on mobile
**File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx`**
- Add `overflow-hidden` to the main flex container for both email and chat headers to prevent horizontal bleed
- Ensure the email header row wraps properly with `min-w-0` on flex children

#### 6. Add SidebarTrigger to conversation view on mobile
**File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx`**
- Add a sidebar trigger (hamburger icon) next to the back button on mobile, so users can access navigation from the conversation detail view

### Technical Details

| File | Change |
|------|--------|
| `UnifiedAppLayout.tsx` | Add mobile-only `SidebarTrigger` in a sticky header bar |
| `ConversationListHeader.tsx` | Add `SidebarTrigger` before "New" button on mobile |
| `ProgressiveMessagesList.tsx` | Responsive `max-w-full md:max-w-5xl`, reduce mobile padding |
| `email-render.tsx` | Add `overflow-x-auto max-w-full` to email content wrapper |
| `ConversationViewContent.tsx` | Add `overflow-hidden` to containers, add sidebar trigger on mobile |

No new dependencies. No database changes. 6 files modified.

