# Revert :has() spacer rule, strip trailing spacers in the render layer

## Diagnosis (confirmed)
`:only-child` ignores text nodes, so `<div>Ja, send gjern...<br>Kenneth</div>` (text + br + text) matches `> div:has(> br:only-child):not(:has(> :not(br)))` and collapses. CSS cannot distinguish "text + br" from "br only" — the :has() approach is abandoned permanently.

## Changes

### 1. Delete the @supports block — `src/index.css` lines 1619–1630

```diff
-/* Collapse pure spacer divs that contain only <br>(s) and no text/elements. ... */
-@supports selector(:has(*)) {
-  .chat-bubble-content .email-render__html-content > div:has(> br:only-child):not(:has(> :not(br))) {
-    line-height: 0 !important;
-    height: 0 !important;
-    overflow: hidden;
-  }
-}
```

KEPT unchanged: the `line-height: 1.5 !important` floor (lines 1609–1613) and the `height: auto / min-height: 0` block (1614–1617).

### 2. Strip trailing whitespace-only nodes in `sanitizeEmailHTML` — `src/utils/emailFormatting.ts`

After `DOMPurify.sanitize(...)` (line 445), before returning, run a trailing-trim pass on the sanitized HTML:

```diff
   const sanitized = DOMPurify.sanitize(processedContent, config);
   DOMPurify.removeAllHooks();
-  return sanitized;
+  return stripTrailingSpacers(sanitized);
```

New helper (same file):

```ts
const stripTrailingSpacers = (html: string): string => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const isSpacer = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) return !node.textContent?.trim();
    if (node.nodeType !== Node.ELEMENT_NODE) return true; // comments
    const el = node as Element;
    if (el.tagName === 'BR') return true;
    if ((el.tagName === 'DIV' || el.tagName === 'P') && !el.textContent?.trim()
        && !el.querySelector('img,table,hr')) return true;
    return false;
  };
  let last = temp.lastChild;
  while (last && isSpacer(last)) {
    const prev = last.previousSibling;
    temp.removeChild(last);
    last = prev;
  }
  return temp.innerHTML;
};
```

- Walks backward from the last child only; stops at the first node with real content — spacers between text blocks are untouched.
- The `img,table,hr` guard keeps trailing image-only/table divs (e.g. signature logos).
- Runs after sanitization in the customer-email render path (`email-render.tsx` → `sanitizeEmailHTML`). No changes to `parseQuotedEmail`, send pipeline, or storage.

## Verification (conv 3e5ec395-…, computed values)
1. Apr-16 "Ja, send gjern et utrolig godt tilbud :) / Kenneth" → visible again, line-height ~21px.
2. Apr-30 "Hei dere / Fått SMS…" and "Da fikk…" → visible, readable, trailing padding reduced.
3. Apr-17 "Hva er dimensjon… K" → visible incl. "K", reduced trailing gap.
4. All other customer email messages visible, none collapsed.
5. Agent purple bubbles unchanged.