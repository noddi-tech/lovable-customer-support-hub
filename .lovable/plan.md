

## Fix: Compress Entire Email Rendering — Root Cause Analysis

### Root Causes (3 bugs causing 70%+ wasted vertical space)

**Bug 1: `white-space: pre-wrap` on HTML emails (biggest impact)**

`src/index.css` line 261 sets `white-space: pre-wrap !important` on `.email-render__html-content`. This preserves ALL whitespace from the HTML source — every newline, every indentation between tags becomes visible vertical space. Outlook HTML source is heavily indented with newlines between every element.

This should be `normal` for HTML emails. Only plain text needs `pre-wrap`.

**Bug 2: DOMPurify hooks are dead code — inline styles survive untouched**

`src/utils/emailFormatting.ts` lines 187-295 place hooks inside a `HOOKS` config key. DOMPurify does NOT support this — hooks must be registered via `DOMPurify.addHook()`. This means:
- Line 223 (`node.setAttribute('style', 'max-width: 100%; ...')`) on images **never runs**
- Lines 252-292 (style sanitizer) **never runs**
- Original Outlook inline styles like `width: 0.8541in; height: 0.8541in`, `padding: 0cm 6pt 3.75pt 0cm` all survive
- While CSS `!important` overrides some, others (like image `width`/`height` in `in` units) are not covered

**Bug 3: Overly generous base typography**

Line 262: `line-height: 1.5` and line 265: `font-size: 14px` are generous. Combined with `prose prose-sm` Tailwind class adding its own margins, everything stacks.

### Fix Plan

#### 1. Split white-space by content type (`src/index.css`)

```css
.email-render__html-content {
  white-space: normal !important;  /* was pre-wrap */
}
.email-render__plain-content {
  white-space: pre-wrap !important; /* keep for plain text */
}
```

#### 2. Register DOMPurify hooks properly (`src/utils/emailFormatting.ts`)

Move the hook logic OUT of the config object. Before calling `DOMPurify.sanitize()`:
```ts
DOMPurify.addHook('afterSanitizeAttributes', function(node) {
  // ... existing hook logic from lines 188-294
});
const sanitized = DOMPurify.sanitize(processedContent, config);
DOMPurify.removeHook('afterSanitizeAttributes'); // cleanup
```
Remove the `HOOKS` key from the config object entirely.

#### 3. Tighten base typography (`src/index.css`)

- `line-height: 1.3` (from 1.5)
- `font-size: 13px` (from 14px)
- Paragraph margin-bottom: `0.15em` (from 0.25em)
- `br` height: `0.3em` (from 0.5em)

### Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/index.css` | Split white-space by content type, tighten typography |
| 2 | `src/utils/emailFormatting.ts` | Register DOMPurify hooks via proper API |

The `white-space: normal` fix alone should cut rendered height by ~40%. Combined with working hooks (stripping inline Outlook styles) and tighter typography, total reduction should hit the 60-70% target.

