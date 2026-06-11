## Root cause (file:line)

`src/index.css` **lines 279–285**:

```css
.email-render__html-content div:empty,
.email-render__html-content div:has(> br:only-child) {
  display: none !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}
```

The intent was to collapse pure spacer divs (`<div><br></div>`). The bug is in `:has(> br:only-child)`:

- CSS `:only-child` counts **element** siblings only. **Text nodes do not count.**
- Gmail wraps each body line/paragraph as `<div>Da fikk jeg melding...<br></div>` — a trailing `<br>` after the text.
- In that div, `<br>` is the only *element* child (text siblings ignored), so `> br:only-child` matches.
- The entire body div is therefore set to `display: none !important`, even though it contains the full visible text.

This is exactly the symptom the DevTools inspection reported: outer `<div dir="ltr">Hei dere…</div>` is visible; the inner `<div>Da fikk… <br></div>` computes `display: none`, `offsetHeight: 0`.

`div:empty` is fine — `:empty` requires no children at all (no element AND no text), so it only hits truly empty `<div></div>`. The `br:only-child` half is the over-matcher and must go.

## Fix (single file, single block)

Drop the `:has(> br:only-child)` selector. Keep `div:empty` (correctly narrow). Spacer `<div><br></div>` divs will still be visually collapsed by the existing `br + br { display: none }` rule (line 288) and the small `br { height: 0.3em }` rule (line 293) — so no spacing regression.

### Diff (`src/index.css` 278–285)

```diff
-  /* SPACING FIX: Collapse empty divs containing only br */
-  .email-render__html-content div:empty,
-  .email-render__html-content div:has(> br:only-child) {
+  /* SPACING FIX: Collapse truly empty divs only.
+     Do NOT use :has(> br:only-child) — :only-child ignores text node siblings,
+     so it over-matches Gmail body divs like <div>text<br></div> and hides them. */
+  .email-render__html-content div:empty {
     display: none !important;
     height: 0 !important;
     margin: 0 !important;
     padding: 0 !important;
   }
+
+  /* Collapse pure-spacer <div><br></div> via line-height (safe: cannot affect
+     divs with text, because their br is paired with text and :only-child still
+     matches, but here we only zero line-height — text would still render).
+     Wrapped in @supports as a progressive enhancement; if absent, the br+br
+     and br { height: 0.3em } rules below already keep spacing tight. */
+  @supports selector(:has(*)) {
+    .email-render__html-content div:has(> br:only-child):not(:has(> :not(br))) {
+      line-height: 0 !important;
+      margin: 0 !important;
+      padding: 0 !important;
+    }
+  }
```

Note: the progressive-enhancement block uses `line-height: 0` (never `display: none`), so even if it still over-matches a Gmail body div, the text remains rendered. This makes the fix safe under any future Gmail markup change.

## Cleanup (optional, separate)

The earlier color/line-height overrides added during this debugging cycle (`-webkit-text-fill-color: inherit`, the whitewash list at lines 1563–1595, the `div:not(:empty) { line-height: 1.3; height: auto }` block at 1598–1603) were dead code for this specific bug. They are harmless and unrelated to the present fix — leave them in place to avoid scope creep; review/remove in a follow-up.

## Verification (post-build, conv `3e5ec395-…`)

1. `bbac3c7c` "Hei dere / Da fikk melding om at dekkene endelig er klare…" → full body visible, inner div `display: block`, `offsetHeight > 0`.
2. `447a78f3` "Hei dere / Fått SMS, men ikke svar…" → full body visible.
3. "Ja, send gjern…/Kenneth", "Ja fint om dere…", "Hva er dimensjon… K" → still visible (no regression).
4. Quoted history (parser-separated `quotedBlocks`) → still hidden/collapsed by the existing toggle in `MessageItem` — unaffected by this CSS.
5. Agent purple bubbles → unchanged.

Switch to build mode to apply.