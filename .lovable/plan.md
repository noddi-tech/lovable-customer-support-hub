

# Replace Status Buttons with a Dropdown

## What Changes

In the conversation sidebar ("STATUS & ACTIONS" section), replace the current layout of individual status buttons (Reopen, Pending, Close Conversation) with a single `Select` dropdown that lists all statuses. This is cleaner UX -- one control instead of 2-3 conditional buttons.

## File to Change

**`src/components/dashboard/conversation-view/CustomerSidePanel.tsx`** (lines 515-575)

Replace the "Current Status" badge + grid of conditional buttons with:

- A single `Select` dropdown showing the current status
- Options: Open, Pending, Closed
- On change, calls the existing `updateStatus()` function
- Disabled while `statusLoading` is true

The result will look like:

```
STATUS & ACTIONS
Status:  [ Open        v ]
```

Instead of:

```
STATUS & ACTIONS
Current Status:        open
[ Pending ]
[   Close Conversation   ]
```

## Technical Details

- Uses the existing `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` components already imported/available in the project
- Reuses the existing `updateStatus()` handler and `statusLoading` state -- no new logic needed
- Removes ~50 lines of conditional button rendering, replaces with ~15 lines of Select markup
- The `onValueChange` handler calls `updateStatus({ status: newValue })` directly

