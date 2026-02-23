
## Objective
Make the conversation-list toolbar visibly smaller and tighter immediately, with emphasis on:
1) Left action buttons (Select/New/Merge/Migrate/Read)  
2) Right Filters + Sort controls

Your latest screenshots show the controls are still visually heavy because of **combined button-group styling + wide horizontal padding + labeled sort prefix + roomy container spacing**, even though some height classes were reduced.

## What I found in current code
- `src/components/dashboard/conversation-list/ConversationListHeader.tsx`
  - Action buttons already use `size="xs"` (`h-6 px-2 text-[11px]`).
  - They are wrapped in `ButtonGroup`, which visually creates one big segmented block (still feels “clumpy”).
  - Filters trigger is custom button `h-6 px-2`.
  - Sort trigger is `SelectTrigger h-6 px-2 text-[11px]` and includes prefix text `"Sort:"` which increases visual bulk.
- `src/components/ui/button.tsx`
  - Smallest current size is `xs: h-6 px-2 text-[11px]`.
  - No extra-compact option below this for dense toolbars.

## Implementation plan (targeted, no global regressions)

### 1) Add an ultra-compact button size specifically for dense toolbars
**File:** `src/components/ui/button.tsx`

- Add new size variant:
  - `xxs: "h-5 px-1.5 text-[10px]"`
- Keep `xs` and `sm` unchanged so other app areas are not unintentionally affected.
- Keep base icon size as-is globally, then override icon size only in this toolbar where needed.

Why: current `xs` is still too roomy for this particular header; `xxs` gives an explicit compact option.

---

### 2) De-clump the left action row by removing segmented-group look
**File:** `src/components/dashboard/conversation-list/ConversationListHeader.tsx`

- Replace `ButtonGroup` usage for the top action row with a regular flex row (`flex items-center gap-1`).
- Apply `size="xxs"` to:
  - Select
  - New
  - Merge
  - Migrate
  - Read
- Add per-button tightening classes:
  - `className="h-5 px-1.5 gap-1 rounded-md"`
- Reduce icon size to `2.5` or `3` consistently (`!w-2.5 !h-2.5` or `!w-3 !h-3`) to match compact text.

Why: this removes the “single chunky segmented bar” feel and reduces visual mass immediately.

---

### 3) Make Filters + Sort match the same compact density
**File:** `src/components/dashboard/conversation-list/ConversationListHeader.tsx`

- Filters trigger:
  - Change to `h-5 px-1.5 text-[10px] gap-1`
  - Keep icon + label, but reduce chevron/icon size.
- Sort trigger:
  - Change to `h-5 px-1.5 text-[10px] gap-1`
  - Remove `"Sort:"` prefix text and show only selected value (e.g., `Latest`) to reduce width.
- Optional if still too wide: cap trigger min width tighter and shorten selected label when needed.

Why: right-side controls currently remain visually larger due spacing and extra prefix text.

---

### 4) Tighten container spacing around controls
**File:** `src/components/dashboard/conversation-list/ConversationListHeader.tsx`

- Reduce top toolbar wrapper padding:
  - from `px-2 py-1.5` to `px-1.5 py-1`
- Reduce row gaps:
  - main row `gap-1.5 -> gap-1`
  - right controls `gap-1 -> gap-0.5`
- Keep active-filter badges row unchanged unless requested (separate area below toolbar).

Why: even with smaller controls, roomy container spacing can still make the toolbar look large.

---

## Expected visual outcome
- Controls become clearly smaller than current state.
- Left row no longer looks like one large chunky block.
- Filters and Sort feel aligned with compact action buttons.
- Header looks denser and closer to your reference compact toolbar behavior.

## Risk and mitigation
- Risk: click targets become very small.
- Mitigation: keep minimum height at `h-5` (20px) only in this toolbar; avoid applying globally across app.

## Validation checklist
1. On `/interactions/text/open?...`, top row appears visibly smaller than current screenshot.
2. Left actions no longer feel “clumpy/merged.”
3. Filters and Sort are same compact height as action buttons.
4. No unintended size changes in unrelated pages/components (since `xxs` is opt-in).
