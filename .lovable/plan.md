

# Unify Custom and Built-in Component Cards

## Problems

1. **Calendar card looks different** -- Custom block cards (`CustomBlockCard`) have a raw component preview without the "Customer sees:" wrapper that built-in cards use. They also lack the "Try it" sandbox button.
2. **No sandbox for custom components** -- There's no way to interact with custom blocks like you can with built-in ones (the "Try it" button that opens an interactive sandbox).
3. **Unnecessary separation** -- The "Custom Components" vs "Built-in Components" split in both Library and Manage tabs creates visual clutter. All components should appear in one unified list with a small badge if they happen to be custom.

## Solution

### A. Unify Card Layout

Replace the separate `CustomBlockCard` component with a single card layout used for all components. Custom blocks will:
- Wrap their preview in the same "Customer sees:" / "PREVIEW" container as built-in blocks
- Have a "Try it" button that opens a sandbox rendering the selected shadcn component interactively (not pointer-events-none)
- Show a small "Custom" badge in the header (already exists), but otherwise look identical

### B. Remove Separate Sections

In both Library grid and Manage tab, remove the "CUSTOM COMPONENTS" / "BUILT-IN COMPONENTS" headers. All components render in one flat list. Custom blocks just have their badge.

### C. Interactive Sandbox for Custom Blocks

The "Try it" sandbox for custom blocks will render the chosen UI component in interactive mode (removing `pointer-events-none`). When the user interacts (e.g., picks a date, checks a checkbox), a toast fires showing the selected value -- same pattern as built-in blocks.

## Technical Details

### File: `src/components/admin/widget/ComponentLibrary.tsx`

**Changes:**

1. **Delete `CustomBlockCard`** (lines 238-294) -- no longer needed

2. **Modify `CustomBlockCard` rendering in Library grid** (line 930-931) -- replace with the unified card that wraps preview in "Customer sees:" and adds "Try it"

3. **Create a unified card** that accepts either a `BlockDefinition` or a `CustomBlockRow` and renders both identically:
   - Same header layout (icon, name, badges)
   - Same preview section with "Customer sees:" wrapper
   - Same "Try it" button opening interactive sandbox
   - For custom blocks, sandbox renders the shadcn component without `pointer-events-none`, with an `onAction` callback that shows a toast

4. **Remove section headers** in `ManageView` (lines 852-859) -- render all rows in a flat list, custom rows first (they already have the "Custom" badge)

5. **Fix calendar preview sizing** -- the calendar currently uses `scale-[0.85] origin-top-left` which makes it look off. Instead, constrain it within a fixed-height container with overflow hidden, same as other previews.

