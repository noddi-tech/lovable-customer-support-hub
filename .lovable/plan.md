

## Mobile Redesign: Conversation View, Reply Area, and Sidebar

### Problems from Screenshots

1. **Sticky "Menu" header overlaps content** -- The `UnifiedAppLayout` renders a sticky `h-10` header with `SidebarTrigger` on mobile. This overlaps the conversation list header which also has its own controls. Double header = wasted space + overlap.

2. **Email messages are insanely long** -- `MessageCard` renders full email HTML with no height constraint. On mobile, a single email can be thousands of pixels tall. No collapse behavior on mobile.

3. **Reply area has horizontal overflow** -- `ReplyArea` uses `p-6` padding, fixed-width elements like `w-[160px]` SelectTrigger, and a row of buttons (`Cancel`, `Reply All` dropdown, status select, `Send` button) that don't wrap on narrow screens.

4. **Chat UI broken** -- The live chat header crams avatar + name + online badge + status dropdown + info button all in one row. On mobile this overflows.

5. **Sidebar text invisible** -- The sidebar uses `text-sidebar-foreground` which maps to `215 25% 35%` (#475569 dark gray) on a `sidebar` background of `220 27% 96%` (#F1F3F7). This should have decent contrast. The real issue is likely that on mobile the sidebar renders as a Sheet with `bg-sidebar` but the text color from `text-sidebar-foreground` may not be applying because the mobile Sheet renders content with different class inheritance. Need to verify.

### Plan

#### 1. Remove duplicate mobile header in UnifiedAppLayout
**File: `src/components/layout/UnifiedAppLayout.tsx`**

The sticky "Menu" bar is redundant -- it overlaps the conversation list header. Remove it entirely. Instead, ensure the `SidebarTrigger` is placed inside the conversation list header and conversation view header (already partially done).

Change: Remove the `isMobile && <div sticky...>` block (lines 40-44). The sidebar trigger is already accessible from the conversation list header.

#### 2. Mobile-optimized ReplyArea
**File: `src/components/dashboard/conversation-view/ReplyArea.tsx`**

- Change `p-6` to `p-3 md:p-6` 
- Make the bottom action row wrap on mobile: `flex flex-wrap`
- On mobile, hide the `Reply All` dropdown and status select -- just show `Send` button full-width
- Reduce textarea `min-h-[140px]` to `min-h-[80px]` on mobile
- Hide the `Ctrl+Enter` hint on mobile

#### 3. Constrain message height on mobile
**File: `src/components/conversations/MessageCard.tsx`**

- On mobile, limit the email body render area to `max-h-[60vh]` with `overflow-y-auto` so a single email doesn't consume the entire screen
- Add a "Show full message" expand button when content is truncated

#### 4. Fix chat header overflow on mobile
**File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx`**

- In the live chat header: on mobile, hide the `Badge` (Online/Offline text) and email subtitle. Keep just: back button + avatar + name + status dot + status dropdown
- In the email header: already mostly handled, but ensure `min-w-0` and `overflow-hidden` on the info section

#### 5. Fix sidebar text visibility on mobile
**File: `src/components/ui/sidebar.tsx`**

The mobile Sheet renders with `bg-sidebar p-0 text-sidebar-foreground` but the inner content inherits colors from shadcn's Sheet overlay. The `[&>button]:hidden` hides the close button. The `text-sidebar-foreground` class should work -- but the `AppMainNav` uses `text-foreground` for the title and standard text classes. The issue is likely that `SidebarGroupLabel` and `SidebarMenuButton` use their own color tokens.

**File: `src/components/layout/AppMainNav.tsx`**
- Add explicit `text-sidebar-foreground` to sidebar menu items and group labels to ensure they're visible against the sidebar background on mobile
- Or simpler: ensure the sidebar Sheet on mobile uses `bg-background text-foreground` instead of `bg-sidebar text-sidebar-foreground` for better contrast

#### 6. Remove timeline rail on mobile
**File: `src/components/conversations/ProgressiveMessagesList.tsx`**

The timeline vertical rail (`left-[26px]`) wastes 26px of horizontal space on mobile. Hide it on mobile with `hidden md:block`.

### Technical Details

| File | Change |
|------|--------|
| `UnifiedAppLayout.tsx` | Remove duplicate sticky mobile header |
| `ReplyArea.tsx` | Responsive padding, wrap action buttons, simplify mobile actions, shorter textarea |
| `MessageCard.tsx` | Add `max-h-[60vh] overflow-y-auto` wrapper on mobile for email body |
| `ConversationViewContent.tsx` | Simplify chat header badges on mobile |
| `AppMainNav.tsx` | Ensure sidebar text contrast on mobile |
| `ProgressiveMessagesList.tsx` | Hide timeline rail on mobile, reduce left padding |

6 files modified. No new dependencies. No database changes.

