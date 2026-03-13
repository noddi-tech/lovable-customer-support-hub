

## Double Collapsed Message Card Height

Currently collapsed message cards have `min-h-[36px]` (line 320 in `MessageCard.tsx`). This will be doubled to `min-h-[72px]` to show more preview text and look tidier.

### Changes

**`src/components/conversations/MessageCard.tsx`** (line 320):
- Change `min-h-[36px]` → `min-h-[72px]`
- Allow the preview text (line 407) to wrap to 2 lines instead of truncating on one line: change `truncate` to `line-clamp-2` so the extra height is used for more text preview

No other functional changes.

