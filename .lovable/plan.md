

## Fix: White Background for the App

### Problem
The app shows a grey-blue tint (`#F8F9FB`) instead of pure white. This happens because:
1. `src/index.css` line 41 sets `--background: 0 0% 100%` (pure white) — correct
2. But `src/contexts/DesignSystemContext.tsx` line 144 has `background: '210 20% 98%'` (#F8F9FB — grey-blue)
3. On mount, `applyToDocument()` overwrites the CSS variable with the design system default, turning the background grey

### Fix

**File: `src/contexts/DesignSystemContext.tsx`** (line 144)

Change:
```typescript
background: '210 20% 98%', // #F8F9FB in HSL
```
to:
```typescript
background: '0 0% 100%', // Pure white #FFFFFF
```

This aligns the design system default with the CSS variable default, giving the app a clean white background everywhere `bg-background` is used.

### What stays the same
- `--card: 0 0% 100%` — already pure white, no change needed
- `--muted: 220 14% 96%` — keeps its subtle grey for sidebar/structural elements (per your theme token mapping)
- The memory note about `bg-background` being "light grey for outer frame" will be updated to reflect it's now pure white

One-line change, no risk of side effects.

