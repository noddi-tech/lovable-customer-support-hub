

## Fix: Constrain Signature Images Across All Devices

### Problem
Signature images (like the Lomundal logo) render at full size on desktop/tablet, making emails look much taller than needed. Constraints only exist for mobile (`.mobile-email-body img { max-height: 80px }`).

### Solution
Add global CSS rules in `src/index.css` that cap signature images on **all** viewports. Since most email signatures don't have an `.email-signature` class wrapper, we also need a heuristic: images that appear after the last paragraph of actual content tend to be signature images. The most reliable CSS-only approach is to:

1. Cap images inside `.email-signature` blocks to `max-height: 80px` globally
2. Add a general rule on all email-render images to cap them at a reasonable height (e.g., `200px`) unless they're explicitly full-width content images -- this prevents any single image from dominating the card while still allowing meaningful content images

### Changes

**File: `src/index.css`** — Add global (non-mobile) rules:

```css
/* Global: constrain signature images across all devices */
.email-render__html-content .email-signature img,
.email-render__plain-content .email-signature img {
  max-height: 80px !important;
  width: auto !important;
  object-fit: contain;
}

/* Global: prevent any single inline image from being excessively tall */
.email-render__html-content img,
.email-render__plain-content img {
  max-height: 200px;
  object-fit: contain;
}

/* Allow explicitly full-width content images to remain large */
.email-render__html-content img[style*="width: 100%"],
.email-render__html-content img.content-image {
  max-height: none;
}
```

This means:
- **Desktop/tablet**: Signature images ≤ 80px tall, other images ≤ 200px tall
- **Mobile**: All images ≤ 80px tall (existing rule stays)
- Full-width content images are exempted everywhere

1 file changed. No functional changes. Works across all breakpoints.

