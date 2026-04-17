
## Plan: Compact customer feedback ratings

### Problem
The current customer feedback section uses 5-star rows for each rating (Overall, Car result, Communication, Ease of use, Politeness). At the sidebar's narrow width, the stars overlap with the numeric value and the labels, causing the messy layout in the screenshot.

### Solution
Replace the 5-star display with a compact single-star + "X.X / 5" numeric format, color-coded by score:
- **Green** (≥4.5): excellent
- **Yellow** (≥3.5): okay
- **Orange** (≥2.5): poor
- **Red** (<2.5): bad

### Changes

**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx` (lines 723–762)**

1. Add a small inline helper `CompactRating` (single ⭐ icon + `value.toFixed(1)/5` text, color from thresholds above).
2. Replace each `<StarRatingInput …>` usage in the feedback block with `<CompactRating value={…} />`.
3. Keep the layout:
   - Overall on its own row (slightly larger).
   - Sub-ratings in a 2-column grid, each as `Label  ★ 5.0/5`.
4. Keep the comment blockquote unchanged.

### Result
A single small star per metric, the score shown numerically (e.g. `★ 5.0/5`), color-coded — fits cleanly in the narrow sidebar with no overlap.

### Files to modify
- `src/components/dashboard/voice/NoddiCustomerDetails.tsx`
