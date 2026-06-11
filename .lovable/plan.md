## Temporary diagnostic logging

Insert three `console.log` calls in `src/utils/emailFormatting.ts` around the existing newline-conversion block (currently lines 166–175). No logic changes.

### Diff

```diff
   let processedContent = parsed.visibleContent || htmlContent;

+  // TEMP DIAGNOSTIC — remove after verification
+  console.log('[NL-CONVERT] pre-conversion processedContent:', JSON.stringify(processedContent.slice(0, 300)));
+  console.log('[NL-CONVERT] guard:', {
+    hasNewline: processedContent.includes('\n'),
+    hasBr: /<br[\s/>]/i.test(processedContent),
+    hasBlock: /<(p|div|table|ul|ol|blockquote|pre|h[1-6])[\s>]/i.test(processedContent),
+  });
+
   if (
     processedContent.includes('\n') &&
     !/<br[\s/>]/i.test(processedContent) &&
     !/<(p|div|table|ul|ol|blockquote|pre|h[1-6])[\s>]/i.test(processedContent)
   ) {
     processedContent = processedContent
       .replace(/\r\n/g, '\n')
       .replace(/\n{2,}/g, '<br><br>')
       .replace(/\n/g, '<br>');
   }
+
+  // TEMP DIAGNOSTIC — remove after verification
+  console.log('[NL-CONVERT] post-conversion:', JSON.stringify(processedContent.slice(0, 300)));
```

### What this tells us

Pre-existing parseQuotedEmail log already shows `visibleHTMLPreview: "Hei Anders,\n\nFørst..."` (length 812 — exact DB length), so `processedContent` almost certainly enters the block with `\n\n` intact and the guard passes. Rendered DOM shows `totalBr: 5, consecutiveBrPairs: 0` (5 paragraph separators, all single `<br>`). If post-conversion log shows `<br><br>` but the DOM still has single `<br>`, the collapse happens **downstream** — most likely in the DOMPurify sanitize call (lines ~180+) or a later normalization step in this same file. That's the next thing to chase.

### After diagnosis

Remove the three `console.log` lines (they're marked TEMP DIAGNOSTIC).

### Scope

- Edits only `src/utils/emailFormatting.ts` (3 log lines added).
- No behavior change, no other files touched.
