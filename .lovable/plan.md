
## Mobile-only redesign plan

### What is actually broken
- The app is still trying to reuse desktop message cards on mobile.
- Chat messages are rendered through `EmailRender`, so widget/chat content can end up blank or badly formatted.
- Email cards are desktop-first: too much header chrome, too much padding, duplicated sender UI, and too much vertical space.
- Customer/API information is desktop-only in email view and not integrated into the mobile flow.
- Current mobile fixes are scattered class tweaks instead of a dedicated mobile experience.

### Design direction
Keep desktop exactly as-is. On mobile, stop “shrinking desktop” and render a separate conversation UI.

## Implementation plan

### 1. Split conversation detail into dedicated mobile shells
**File:** `src/components/dashboard/conversation-view/ConversationViewContent.tsx`

Add a mobile-only branch:
- `MobileEmailConversationView`
- `MobileChatConversationView`

Desktop keeps the current existing layout untouched.

These mobile views will own:
- compact top bar
- compact customer summary
- mobile message list
- mobile reply/composer
- mobile customer info drawer/sheet

### 2. Build a real mobile email experience
**New components**
- `src/components/mobile/conversations/MobileEmailConversationView.tsx`
- `src/components/mobile/conversations/MobileEmailMessageCard.tsx`
- `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx`
- `src/components/mobile/conversations/MobileCustomerDetailsSheet.tsx`

**Behavior**
- Remove duplicate sender/avatar clutter from each message card
- Use smaller typography and tighter spacing
- Show sender + timestamp in one compact row
- Default to a compressed message preview with “Show more”
- Collapse signature / quoted / long HTML sections behind explicit toggles
- Show customer/API summary above the thread on mobile
- Open full Noddi/customer data in a bottom sheet instead of side panel

### 3. Build a separate mobile chat renderer
**New components**
- `src/components/mobile/conversations/MobileChatConversationView.tsx`
- `src/components/mobile/conversations/MobileChatMessageList.tsx`
- `src/components/mobile/conversations/MobileChatBubble.tsx`
- `src/components/mobile/conversations/MobileChatCustomerSheet.tsx`

**Critical fix**
For widget/chat messages, do not rely only on `message.visibleBody`.
Add a safe content resolver:
- prefer `message.visibleBody` if non-empty
- otherwise fall back to `message.originalMessage?.content`
- render plain chat text as text, not as email HTML
- only use `EmailRender` for real HTML/email-like content

This should fix the “blank chat body / only customer info visible” issue.

### 4. Add mobile-specific content resolution
**Files**
- `src/components/conversations/ChatMessagesList.tsx`
- or new shared helper in `src/lib/normalizeMessage.ts` / new utility

Add a shared mobile-safe resolver for message body:
- widget/customer chat fallback
- stripped text fallback if HTML parser returns effectively empty output
- attachment-aware rendering for chat vs email

### 5. Replace desktop email card behavior on mobile
**File:** `src/components/conversations/ProgressiveMessagesList.tsx`

On mobile email conversations:
- render `MobileEmailMessageCard` instead of `MessageCard`
- keep `MessageCard` for desktop only

On mobile chat conversations:
- render `MobileChatMessageList` instead of `ChatMessagesList`

This is the key structural change that prevents desktop regressions.

### 6. Surface customer/API info on mobile email
**Files**
- `src/components/dashboard/conversation-view/ConversationViewContent.tsx`
- reuse `NoddiCustomerDetails` data, but present it in mobile components

Add a compact mobile customer summary block above the email thread:
- name
- email / phone
- booking badge / status
- quick “View details” action

This fixes the current issue where API customer information is missing in mobile email view.

### 7. Simplify mobile composer areas
**Files**
- `src/components/dashboard/conversation-view/ReplyArea.tsx`
- `src/components/conversations/ChatReplyInput.tsx`

Create mobile-only composer layout:
- compact textarea
- single primary send row
- secondary tools behind a “More” sheet/menu
- no desktop-width action rows on mobile
- attachments shown in a compact horizontal strip

### 8. Keep email HTML readable without giant cards
**File:** `src/components/ui/email-render.tsx`

Mobile-only adjustments:
- smaller base text
- tighter line height and paragraph spacing
- constrain tables/images
- clamp signature blocks
- reduce prose spacing
- avoid giant blank margins from imported HTML

Important: do this behind mobile-only wrapper classes so desktop rendering stays unchanged.

## Files to touch
- `src/components/dashboard/conversation-view/ConversationViewContent.tsx`
- `src/components/conversations/ProgressiveMessagesList.tsx`
- `src/components/conversations/ChatMessagesList.tsx`
- `src/components/dashboard/conversation-view/ReplyArea.tsx`
- `src/components/conversations/ChatReplyInput.tsx`
- `src/components/ui/email-render.tsx`

## New files to add
- `src/components/mobile/conversations/MobileEmailConversationView.tsx`
- `src/components/mobile/conversations/MobileEmailMessageCard.tsx`
- `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx`
- `src/components/mobile/conversations/MobileCustomerDetailsSheet.tsx`
- `src/components/mobile/conversations/MobileChatConversationView.tsx`
- `src/components/mobile/conversations/MobileChatMessageList.tsx`
- `src/components/mobile/conversations/MobileChatBubble.tsx`
- `src/components/mobile/conversations/MobileChatCustomerSheet.tsx`

## Why this plan will hold up
- Desktop is preserved by branching on mobile only.
- Chat and email stop sharing the wrong renderer.
- Customer/API info becomes part of the mobile flow instead of a hidden desktop sidebar.
- Message density, hierarchy, and actions become intentionally mobile-first instead of patched.

## Acceptance criteria
- Mobile chat always shows actual customer message content
- Mobile email cards are shorter, denser, and easier to scan
- Customer/Noddi info is visible on mobile email and chat
- No horizontal overflow in headers, bodies, or composer
- Desktop visuals and behavior remain unchanged
