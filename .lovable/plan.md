

## Fix: Compress Email Signatures in HTML Emails

### Problem

Outlook-style HTML email signatures use `MsoNormalTable` tables with generous inline padding, heights, and spacing. These are never wrapped in `.email-signature`, so none of our signature-compressing CSS applies. The result: a short email like "Hei, EV59957" takes 3x more vertical space than needed because the signature block dominates.

### Root Cause

1. **No HTML signature detection** — only `plainTextEmailFormatter.ts` wraps signatures in `.email-signature`. HTML emails pass through `emailFormatting.ts` without any signature detection.
2. **Empty paragraphs** between body and signature create large gaps (consecutive `<p>&nbsp;</p>` or `<p><br></p>` blocks).
3. **Inline Outlook styles** on signature table cells (`padding`, `height`) override our CSS.

### Solution — Two-pronged approach

#### 1. Detect and wrap HTML signature blocks (`src/utils/emailFormatting.ts`)

After HTML processing but before sanitization, use a DOM-based heuristic to find signature-like content and wrap it in `<div class="email-signature">`:

**Heuristics** (applied to the last table/block in the email):
- Table with class `MsoNormalTable` that contains an inline image (CID or attachment) + contact info (phone link, email, website)
- Elements after an `<hr>` near the bottom of the email
- Any block matching common signature patterns (name + title + phone/url in a small table)

Implementation: parse HTML into a temp DOM element, walk backwards from the last child, and wrap detected signature blocks.

#### 2. Collapse empty spacing elements (`src/utils/emailFormatting.ts`)

Add regex passes to strip empty `<p>` tags containing only `&nbsp;`, `<br>`, or whitespace — these are Outlook's spacer paragraphs:

```
.replace(/<p[^>]*>\s*(&nbsp;|\s|<br\s*\/?>)*\s*<\/p>/gi, '')
```

#### 3. CSS: Compact signature rendering (`src/index.css`)

Add rules for `.email-signature` in HTML context:
- Tighten line-height and font-size (already partially there via Tailwind classes on the container)
- Override Outlook inline padding on signature `td` elements
- Cap signature block max-height with overflow hidden + "show more" potential

```css
.email-render__html-content .email-signature table {
  width: auto !important;
}
.email-render__html-content .email-signature td {
  padding: 0 4px 2px 0 !important;
  height: auto !important;
}
.email-render__html-content .email-signature p {
  margin: 0 !important;
  line-height: 1.2 !important;
}
```

### Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/utils/emailFormatting.ts` | Add HTML signature detection + empty paragraph stripping |
| 2 | `src/index.css` | Add compact CSS for `.email-signature` in HTML emails |

No new dependencies. Non-signature content unaffected. Plain text signature handling unchanged.

