# Convert newline-only "HTML" bodies to <br> at sanitize time

## Grep result
Body content destined for `.email-render__html-content` is prepared in exactly one place per branch:

- `src/components/ui/email-render.tsx:282-295` decides HTML vs plain text. HTML branch calls `sanitizeEmailHTML(...)` (line 284). Plain-text branch calls `formatPlainTextEmail(...)` (line 294) which already converts `\n\n`/`\n` correctly via `processPlainTextStructure`.
- `src/utils/emailFormatting.ts:130-453` `sanitizeEmailHTML` — runs `parseQuotedEmail`, sets `processedContent` (line 159), then DOMPurify (line 445), then `stripTrailingSpacers` (line 452). No newline handling anywhere in this path.

DB check on the Robert agent reply (`e44bdf0b-…`): `content_type='html'`, but stored body is pure plain text starting `Hei Anders,\n\nFørst og fremst…` with ZERO `<br>` / block tags. So `isHTML` is true (it trusts `content_type`), the HTML branch runs, newlines pass through untouched, and `white-space: normal` collapses them. Customer Gmail messages are unaffected because their bodies contain real `<br>` tags.

No existing newline conversion lives in the HTML path, so there's no double-convert risk.

## Diff

`src/utils/emailFormatting.ts` — insert a guarded conversion immediately after `processedContent` is assigned (line 159), before the existing sanitize logic. Nothing else changes.

```diff
   // Use the visible content (with <pre> wrappers removed and entities decoded)
   let processedContent = parsed.visibleContent || htmlContent;

+  // Newline-only bodies arriving on the HTML path (e.g. agent replies stored
+  // with content_type='html' but no markup) collapse to a single line under
+  // white-space:normal. Convert \n\n -> <br><br> and remaining \n -> <br>
+  // ONLY when the body is plain text with newlines and no existing markup.
+  // Customer Gmail bodies (which already use <br>/block tags) are skipped.
+  if (
+    processedContent.includes('\n') &&
+    !/<br[\s/>]/i.test(processedContent) &&
+    !/<(p|div|table|ul|ol|blockquote|pre|h[1-6])[\s>]/i.test(processedContent)
+  ) {
+    processedContent = processedContent
+      .replace(/\r\n/g, '\n')
+      .replace(/\n{2,}/g, '<br><br>')
+      .replace(/\n/g, '<br>');
+  }
+
   // STEP 2: Continue with existing sanitization logic
```

That is the entire change. DOMPurify already allows `<br>` so the inserted tags survive sanitize. `stripTrailingSpacers` will trim trailing `<br>`s as it already does.

## Untouched (explicit)
- `parseQuotedEmail` — unchanged
- send pipeline / storage — unchanged
- `formatPlainTextEmail` and the plain-text branch in `email-render.tsx` — unchanged
- CSS: no `white-space` change; `br + br` stays removed; `br { height: 0.3em }`, `div:empty`, line-height 1.5 floor — unchanged
- `stripTrailingSpacers` — unchanged

## Why safe
- Guard requires `\n` AND no `<br>` AND no block-level tag. Customer Gmail messages always contain `<br>` (Jun-2/Jun-8 confirmed via DB) → guard skips them.
- Plain-text branch is unaffected because it never calls `sanitizeEmailHTML`.
- HTML agent replies that genuinely contain markup (any `<p>`, `<div>`, `<br>`, table, list, blockquote, heading, `<pre>`) are skipped → no double-spacing.
- `<br>` is in the existing `ALLOWED_TAGS`, so DOMPurify keeps the conversions.

## Verification (conv `3e5ec395-…`)
1. Robert agent Jun-2 reply ("Hei Anders, / Først og fremst…") now renders with blank lines between paragraphs; probe shows `totalBr > 0`.
2. Customer Jun-2 "Hei, / Jeg sender…" unchanged (guard skips — body has `<br>`).
3. Customer Jun-8 "Hei Robert, / Tusen takk…" unchanged (guard skips).
4. Other agent purple bubbles render with proper paragraph breaks.
5. No double-spacing on any customer message (guard correctly skipped HTML bodies).

Report back: confirm the agent reply now has paragraph breaks and the two customer messages are visually identical to before.
