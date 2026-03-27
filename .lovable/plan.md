

## Fix: Signature Logo Image Still 200x200

### Root Cause

The signature logo (Lomundal teardrop) is a CID-referenced inline attachment. During email formatting, `emailFormatting.ts` rewrites all CID images with `class="email-attachment-image" data-attachment="true"`. This causes the CSS rule at line 565 to apply:

```css
.email-render__html-content img.email-attachment-image {
  max-height: 300px !important;   /* overrides our 200px rule */
  min-height: 100px !important;   /* forces minimum size */
}
```

Our global `max-height: 200px` rule (line 383) has no `!important` so it loses. The `.email-signature` rule never matches because the image isn't inside an `.email-signature` wrapper.

### Fix

**CSS-only approach** — add a size cap for inline attachment images that are small (signature logos). The attachment metadata has `isInline` info, but it's not propagated to the HTML class. Two changes:

1. **`src/utils/emailFormatting.ts`**: When rewriting CID/Content-Location images, check `assetInfo.attachment.isInline`. If true, add an extra class `email-inline-image` alongside `email-attachment-image`.

2. **`src/index.css`**: Add a rule that caps `.email-inline-image` to `max-height: 80px` — inline images are almost always signature logos, not content images. This overrides the attachment rule.

### Changes

| File | Change |
|------|--------|
| `src/utils/emailFormatting.ts` | Add `email-inline-image` class when `assetInfo.attachment.isInline === true` on all CID/Content-Location rewrites |
| `src/index.css` | Add global + mobile rule: `.email-inline-image { max-height: 80px !important; min-height: 0 !important; width: auto !important; }` |

2 files. No new dependencies. Non-inline attachment images unchanged.

