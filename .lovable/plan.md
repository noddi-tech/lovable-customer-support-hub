
# Remove Grey Background from Conversation List Panel

## Problem

The conversation list panel (toolbar + table header + rows) sits inside a parent container styled with `bg-card`, which renders as grey. Even though the header itself uses `bg-background` (white), the parent wrapper overrides the visual appearance, making the whole area look grey.

## Root Cause

In `src/components/dashboard/InteractionsLayout.tsx`, the `ResizablePanel` and mobile wrapper both use `bg-card`:

- **Line 197** (mobile): `className="flex flex-col bg-card border-b border-border min-h-0 flex-1"`
- **Line 243** (desktop): `className="flex flex-col bg-card border-r border-border/30 min-h-0"`

## Fix

**File: `src/components/dashboard/InteractionsLayout.tsx`**

1. **Line 197** -- Change `bg-card` to `bg-background` on the mobile conversation list wrapper
2. **Line 243** -- Change `bg-card` to `bg-background` on the desktop ResizablePanel

This makes the entire conversation list panel white, matching the toolbar and table headers.

## Files Changed

| File | Change |
|---|---|
| `src/components/dashboard/InteractionsLayout.tsx` | Replace `bg-card` with `bg-background` on lines 197 and 243 |
