
# Make Buttons Compact + Fix Conversation Text Size

## Problem 1: Buttons too big/clumpy

The `sm` button size is `h-9 px-3` (36px tall). The reference screenshot shows buttons that are roughly 28px tall with tighter padding. The header toolbar buttons all use `size="sm"`, so reducing the `sm` variant dimensions will fix them globally.

## Problem 2: Conversation text still larger than other columns

Line 313 in `ConversationTableRow.tsx` (the non-virtualized/table version) still uses `text-sm` for the subject text. This was missed in the previous change. The virtualized version (line 173) is correctly `text-xs`.

## Changes

### 1. `src/components/ui/button.tsx`

Make the `sm` size variant more compact:
- Change from `h-9 px-3` to `h-7 px-2.5`
- Also reduce the default icon size from `size-4` (16px) to `size-3.5` (14px) in the base class
- Reduce gap from `gap-2` to `gap-1.5` for tighter spacing

### 2. `src/components/dashboard/conversation-list/ConversationListHeader.tsx`

Make the Filters dropdown trigger and Sort select trigger match the smaller button height:
- Line 166: Change `h-9` to `h-7` on the Filters trigger button
- Line 217: Change `h-9` to `h-7` on the Sort SelectTrigger

### 3. `src/components/dashboard/conversation-list/ConversationTableRow.tsx`

Fix the remaining `text-sm` on line 313 (non-virtualized table row subject text) to `text-xs`.

## Files changed

| File | Change |
|---|---|
| `src/components/ui/button.tsx` | `sm` size: `h-9 px-3` -> `h-7 px-2.5`, base: `gap-2` -> `gap-1.5`, icon size `size-4` -> `size-3.5` |
| `src/components/dashboard/conversation-list/ConversationListHeader.tsx` | Filters trigger and Sort trigger height `h-9` -> `h-7` |
| `src/components/dashboard/conversation-list/ConversationTableRow.tsx` | Line 313 subject text `text-sm` -> `text-xs` |
