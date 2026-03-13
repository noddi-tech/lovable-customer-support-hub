

## Show More Preview Text in Collapsed Cards

The collapsed cards have the extra height now (`min-h-[72px]`), but the preview text is rendered **inline** in a single flex row alongside the avatar, date, and badge — so `line-clamp-2` can't actually wrap to a second line within that constrained flex layout.

### Fix

**`src/components/conversations/MessageCard.tsx`**:

Move the preview text **out** of the inline flex row and into its own block below the header line when collapsed. This way the extra height is used for a proper multi-line text preview.

Specifically:
1. **Remove** the preview `<span>` from inside the flex row (line 406-410)
2. **Add** a new `<div>` after the flex row (but still inside the `px-4` container) that renders the preview text as a `line-clamp-2` block when `effectiveCollapsed` is true
3. Give it `pl-6.5` (or similar) left padding to align with the text after the avatar, and `pb-1` for bottom spacing

This ensures the preview text gets its own lines and the doubled height is actually used for content.

