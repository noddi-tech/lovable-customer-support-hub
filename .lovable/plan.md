

# Redesign Toolbar: ButtonGroup + Text Labels + Select for Filters/Sort

## Overview

Restructure the conversation list toolbar to use a **ButtonGroup** for action buttons (with text + icon), and **Select** components for Filters and Sort -- grouped on the right side.

## Layout

```text
LEFT SIDE                                    RIGHT SIDE
[Select] [+New] [Merge] [Migrate] [Read]     [Filters: All v] [Sort: Latest v]
 ButtonGroup (outline buttons)                Two Select components
```

## Changes

### 1. Create `src/components/ui/button-group.tsx`

A simple container component that groups buttons with connected borders (first child gets rounded-left, last gets rounded-right, middle children have no border-radius). Uses `role="group"`.

```tsx
const ButtonGroup = ({ className, ...props }) => (
  <div
    role="group"
    className={cn(
      "inline-flex items-center rounded-md [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child)]:-ml-px",
      className
    )}
    {...props}
  />
)
```

### 2. Rewrite `ConversationListHeader.tsx`

**Left side -- ButtonGroup with text + icon buttons:**

- **Select** button: `<Button variant="outline" size="sm"><CheckSquare /> Select</Button>`
- **+New** button: `<Button variant="default" size="sm"><Plus /> New</Button>` (primary CTA, stands out)
- **Merge** button: `<Button variant="outline" size="sm"><Settings /> Merge</Button>`
- **Migrate** button: `<Button variant="outline" size="sm"><Move /> Migrate</Button>`
- **Mark Read** button: `<Button variant="outline" size="sm"><CheckCheck /> Read</Button>`

All wrapped in `<ButtonGroup>`. Each button shows **icon + text label** (not icon-only). Size `sm` (h-9) keeps them compact but readable.

**Right side -- Two Select components:**

- **Filters Select**: Replace the DropdownMenu with a custom filter trigger. Since Select only supports single value, keep filters as a DropdownMenu but styled to look like a Select (with the chevron-down icon and border styling). The trigger text shows the active filter summary (e.g., "Status: Open" or "Filters" when none active).

- **Sort Select**: Keep as `<Select>` component (already works well). Shows current sort value.

Both are grouped together on the right with `ml-auto`.

**Specific implementation details:**

| Element | Component | Variant | Content |
|---|---|---|---|
| Select toggle | Button in ButtonGroup | outline | CheckSquare icon + "Select" text |
| New | Button in ButtonGroup | default | Plus icon + "New" text |
| Merge | DialogTrigger Button in ButtonGroup | outline | Settings icon + "Merge" text |
| Migrate | DialogTrigger Button in ButtonGroup | outline | Move icon + "Migrate" text |
| Mark Read | Button in ButtonGroup | outline | CheckCheck icon + "Read" text |
| Filters | DropdownMenu (styled like Select) | - | Filter icon + current filter text + ChevronDown |
| Sort | Select component | - | Current sort value + ChevronDown |

### 3. Remove tooltips from action buttons

Since all buttons now have visible text labels, tooltips are no longer needed on the action buttons. TooltipProvider can be removed.

### 4. Keep active filter badges

The bottom row showing active filter badges (Status: open, Priority: high, etc.) remains unchanged.

### Files Changed

| File | Action |
|---|---|
| `src/components/ui/button-group.tsx` | **Create** -- new ButtonGroup component |
| `src/components/dashboard/conversation-list/ConversationListHeader.tsx` | **Rewrite** -- ButtonGroup for actions, Select-styled filters, text+icon buttons |

### Technical Notes

- The ButtonGroup component uses CSS selectors (`[&>*:first-child]`, `[&>*:last-child]`) to handle connected border-radius, avoiding extra wrapper elements.
- The `-ml-px` on non-first children prevents double borders between buttons.
- Buttons inside DialogTrigger work via `asChild` prop to pass through the ButtonGroup styling.
- The Filters trigger stays as a DropdownMenu (since it needs radio groups for two dimensions: status + priority) but is styled with the same border/height as the Sort Select for visual consistency.

