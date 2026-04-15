

# Replace AI Suggestions list with a Sheet overlay

## Problem
Currently, AI suggestions appear as a stacked list of preview cards in the reply area. To see a full suggestion, you must click "View" on each one individually via a dialog. This is slow and loses context.

## Solution
Replace the inline suggestion cards + dialog with a **Sheet** (slide-in panel from the right) that displays **all suggestions at once in a two-column grid** on desktop. The conversation remains visible behind the semi-transparent overlay, preserving chat context.

## Changes

### 1. Create `AiSuggestionsSheet.tsx`
New component replacing both the inline cards and `AiSuggestionDialog`:
- Sheet slides in from the right (`side="right"`, wider than default — `sm:max-w-3xl`)
- Header: "AI Suggestions (N)" with sparkle icon
- Body: `grid grid-cols-1 md:grid-cols-2 gap-3` — each suggestion is a full card showing the complete text (in a scroll area if long), character count, and action buttons ("Use as-is", "Refine")
- Refine: clicking "Refine" on a card expands an inline textarea + submit button on that card
- Footer or per-card: "Use as-is" inserts the suggestion and closes the sheet

### 2. Update `ReplyArea.tsx`
- Remove the inline `<div className="grid gap-2">` suggestion cards block (lines 313–349)
- Remove `<AiSuggestionDialog>` usage (lines 352–360)
- Add state: `showSuggestionsSheet` (boolean)
- When suggestions arrive, auto-open the sheet
- The "AI Suggest" button in the toolbar also toggles the sheet open
- Pass suggestions, handlers (`onUseAsIs`, `onRefine`) to the new sheet component

### 3. Remove or keep `AiSuggestionDialog.tsx`
Keep the file but it will no longer be imported from `ReplyArea`. Can be cleaned up later if unused elsewhere.

## Technical details

**Sheet content structure:**
```
┌─────────────────────────────────────────┐
│ ✨ AI Suggestions (5)              [X]  │
│ Review and pick a suggestion            │
├────────────────┬────────────────────────┤
│ Suggestion 1   │ Suggestion 2           │
│ (full text)    │ (full text)            │
│ ~253 chars     │ ~192 chars             │
│ [Use] [Refine] │ [Use] [Refine]         │
├────────────────┼────────────────────────┤
│ Suggestion 3   │ Suggestion 4           │
│ (full text)    │ (full text)            │
│ ~189 chars     │ ~169 chars             │
│ [Use] [Refine] │ [Use] [Refine]         │
├────────────────┴────────────────────────┤
│ Suggestion 5                            │
│ (full text)                             │
│ ~170 chars                              │
│ [Use] [Refine]                          │
└─────────────────────────────────────────┘
```

**Files to create:**
- `src/components/dashboard/conversation-view/AiSuggestionsSheet.tsx`

**Files to modify:**
- `src/components/dashboard/conversation-view/ReplyArea.tsx` — swap inline cards + dialog for sheet

