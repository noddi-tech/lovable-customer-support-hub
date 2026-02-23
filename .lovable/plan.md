
# Normalize Text Size to Match Table Headers (text-xs)

## Goal

Make all text across the conversation list UI consistent with the table header size (`text-xs` / 12px). Currently the table headers use `text-xs` but other elements use the larger `text-sm` (14px).

## Changes

### 1. `src/components/dashboard/conversation-list/ConversationTableRow.tsx`

Change customer name and subject text from `text-sm` to `text-xs`:
- Line 160: Customer name `text-sm` -> `text-xs`
- Line 173: Subject/conversation text `text-sm` -> `text-xs`
- Line 300 (mobile view): Customer name `text-sm` -> `text-xs`

### 2. `src/components/layout/InboxList.tsx`

Change sidebar section headers and filter labels from `text-sm` to `text-xs`:
- Line 122: "Inboxes" heading `text-sm` -> `text-xs`
- Line 168: "Filters" heading `text-sm` -> `text-xs`
- Line 185: Filter name labels `text-sm` -> `text-xs`

### 3. `src/components/dashboard/conversation-list/ConversationListHeader.tsx`

Change toolbar controls from `text-sm` to `text-xs`:
- Line 166: Filters dropdown trigger `text-sm` -> `text-xs`
- Line 217: Sort select trigger `text-sm` -> `text-xs`

### 4. `src/components/ui/button.tsx`

Change the base button font size from `text-sm` to `text-xs` so all buttons (Select, New, Merge, Migrate, Mark Read, etc.) match:
- Line 8: Base button class `text-sm` -> `text-xs`

## What stays the same

- Badge text sizes (already `text-xs`)
- Icon sizes (unchanged)
- Table header cells (already `text-xs`)
- Channel labels, waiting time, etc. (already `text-xs`)

## Impact

All visible text in the conversation list view -- sidebar labels, toolbar buttons, filter/sort controls, customer names, and conversation subjects -- will use 12px (`text-xs`), matching the table header size the user prefers.
