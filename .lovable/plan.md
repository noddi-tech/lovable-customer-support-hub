

## Collapsed Message Card Tweaks

Two changes to `src/components/conversations/MessageCard.tsx`:

### 1. More spacing between avatar and date/badge content
- **Line 333**: Change collapsed gap from `gap-1.5` to `gap-3` so the date and name badge aren't hugging the avatar
- **Line 355**: Change collapsed metadata gap from `gap-1.5` to `gap-2.5`

### 2. Increase collapsed card height by 50% (72px → 108px) for more preview
- **Line 320**: Change `min-h-[72px]` → `min-h-[108px]`
- **Line 416**: Change `line-clamp-2` → `line-clamp-3` to use the extra space for a third line of preview text

