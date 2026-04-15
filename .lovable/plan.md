

# Apply AI Suggestions Sheet to Chat view (compact single-column)

## Problem
The chat `ChatReplyInput.tsx` still uses the old inline preview cards with "View" badges and `AiSuggestionDialog`. The user wants the same Sheet overlay approach used in email, but with a **single-column layout** to save space (not two columns).

## Changes

**File: `src/components/conversations/ChatReplyInput.tsx`**

1. **Import `AiSuggestionsSheet`** instead of `AiSuggestionDialog`
2. **Add `showSuggestionsSheet` state** (boolean)
3. **Remove inline suggestion cards** (lines 519–550) — the stacked cards with "View" badges
4. **Replace with a compact "View Suggestions" button** that opens the sheet when suggestions exist
5. **Remove `AiSuggestionDialog`** (lines 829–837) and related state (`selectedSuggestionForDialog`, `originalSuggestionText`)
6. **Add `<AiSuggestionsSheet>`** with handlers for `onUseAsIs` and `onRefine`
7. **Auto-open sheet** after `handleGetAiSuggestions` completes (same as email ReplyArea)

**File: `src/components/dashboard/conversation-view/AiSuggestionsSheet.tsx`**

8. **Change grid to single column** — replace `grid grid-cols-1 md:grid-cols-2` with `grid grid-cols-1` so suggestions stack vertically in a compact list, taking less horizontal space

## Files to modify
- `src/components/conversations/ChatReplyInput.tsx` — swap cards + dialog for sheet
- `src/components/dashboard/conversation-view/AiSuggestionsSheet.tsx` — single-column layout

