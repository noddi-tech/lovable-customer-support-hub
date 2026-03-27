

## Fix: CID Images Always Treated as Inline

### Root Cause

The `email-inline-image` class depends on `assetInfo.attachment.isInline` being `true`. But attachments synced **before** we added the `isInline` field have it as `undefined` (falsy), so the class is never applied. The image gets the standard attachment rules: `min-height: 100px; max-height: 300px` — making it render at 200x200 instead of respecting the original ~82px dimensions.

### Key Insight

Any image referenced via `cid:` is **by definition** an inline image. We don't need to check `isInline` inside the CID replacement block — we can always add the `email-inline-image` class there.

### Fix

**File: `src/utils/emailFormatting.ts`**

1. **Line 315**: Change `const inlineClass = assetInfo.attachment.isInline ? ' email-inline-image' : '';` to `const inlineClass = ' email-inline-image';` — all CID-referenced images are inline by definition.

2. **Lines 319-321**: The `if (assetInfo.attachment.isInline)` guard for hiding missing CID images should also be removed — all CID misses should be hidden (this is already the behavior at line 333 for full misses).

This means CID images will always get the `email-inline-image` class → 40px max-height, no min-height. Historical attachments without `isInline` are fixed without a re-sync.

1 file, ~3 lines changed.

