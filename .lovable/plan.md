

## Make Conversation List, Emails, and Chats Mobile-Friendly

### Current Problems

1. **Conversation list table is desktop-only**: The `ConversationTableRow` uses fixed-width columns (`w-48`, `w-32`, `w-24`, `w-28`, `w-20`) that overflow on mobile. No mobile-specific card layout exists.

2. **No back button visible on mobile**: When viewing a conversation on mobile, the `InteractionsLayout` hides the list and shows the conversation view, but there's no obvious way to navigate back (the back button exists in `ConversationViewContent` but the sidebar is hidden).

3. **Header toolbar overflows**: `ConversationListHeader` renders 5+ action buttons and 2 dropdowns in a single row — unusable on small screens.

4. **Side panel still renders on mobile**: The `CustomerSidePanel` is hidden (`!isMobile`), but the conversation view header still has too many controls crammed in one row.

5. **Reply area takes too much space**: The reply area with its toolbar can consume most of the mobile viewport.

6. **Sidebar navigation**: The `AppMainNav` sidebar works as a collapsible sidebar but on mobile the conversation list + sidebar compete for space.

### Plan

#### 1. Mobile conversation list card layout
**File: `src/components/dashboard/conversation-list/ConversationTableRow.tsx`**

Add a mobile-specific card layout that renders when `useIsMobile()` is true:
- Show avatar + customer name + subject on first line
- Show status badge + channel icon + waiting time on second line  
- Compact single-tap card instead of wide table row
- Apply to both the virtualized (`style` prop) and standard table row variants

#### 2. Mobile-friendly conversation list header
**File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`**

- On mobile: show only essential actions (New, Filters, Sort) in a compact row
- Hide Merge, Migrate, Select, Mark Read behind a "more" menu
- Reduce padding and use icon-only buttons where possible

#### 3. Mobile conversation view header
**File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx`**

- Simplify the email header on mobile: back button + customer name + status dropdown only
- Move Refresh, Expand/Collapse, Presence indicators behind overflow menu or remove on mobile
- For live chat header: same treatment — essential info only

#### 4. Mobile back navigation improvement  
**File: `src/components/dashboard/InteractionsLayout.tsx`**

- When a conversation is selected on mobile and the user presses browser back or taps a back button, return to the conversation list
- Ensure the back button in `ConversationViewContent` properly triggers `setShowConversationList(true)`

#### 5. Reply area mobile optimization
**File: `src/components/conversations/LazyReplyArea.tsx`**

- On mobile, make the reply trigger buttons sticky at the bottom
- When reply area is open, it should not push content off-screen — use a bottom sheet pattern or limit height

### Technical Details

| File | Change |
|------|--------|
| `ConversationTableRow.tsx` | Add mobile card layout branch using `useIsMobile()`, render compact 2-line card instead of wide table row |
| `ConversationListHeader.tsx` | Wrap secondary actions in overflow menu on mobile, icon-only primary actions |
| `ConversationViewContent.tsx` | Simplify header for mobile in both email and live chat branches |
| `InteractionsLayout.tsx` | Wire back navigation so mobile users can return to list; pass `onBack` callback |
| `LazyReplyArea.tsx` | Constrain reply area height on mobile |

### Scope
5 files modified. No new dependencies. No database changes.

