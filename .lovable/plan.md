## Diff (`src/index.css`, after line 1617)

Add a scoped, direct-child-only `@supports :has()` rule that collapses trailing/standalone spacer divs containing only `<br>` children:

```diff
 .chat-bubble-content .email-render__html-content div {
   height: auto !important;
   min-height: 0;
 }
+
+/* Collapse pure spacer divs that contain only <br>(s) and no text/elements.
+   SCOPED with `>` to DIRECT children of .email-render__html-content only — does
+   NOT match nested body divs like <div>text<div>body</div></div> (those are
+   not direct children, and the outer is excluded by the :not guard because it
+   contains a non-br element). Safe: a br-only div has no text to hide. */
+@supports selector(:has(*)) {
+  .chat-bubble-content .email-render__html-content > div:has(> br:only-child):not(:has(> :not(br))) {
+    line-height: 0 !important;
+    height: 0 !important;
+    overflow: hidden;
+  }
+}
```

## Why this is safe (vs. the bug we just fixed)

Previous broken rule had no `>` combinator → matched nested body divs (`<div>text<div>body</div></div>`), zeroing real text.

New rule:
- `> div` — only direct children of `.email-render__html-content`.
- `:has(> br:only-child)` — the div's sole child is a `<br>`.
- `:not(:has(> :not(br)))` — no non-`<br>` element children (text nodes are not elements, but a br-only div by construction has no text either).

Outer body div like `<div>Hei dere<div>Da fikk...</div></div>`:
- Has `<div>` child → fails `br:only-child` AND fails `:not(:has(> :not(br)))`. Excluded.

Trailing spacer `<div><br></div>`:
- Sole child is `<br>` → matches. Collapsed.

## Out of scope

`normalizeMessage`, `sanitizeEmailHTML`, parser changes. No removal of existing `div:empty` / `br+br` / `br { height: 0.3em }` / line-height:1.5 floor.

## Verification (conv `3e5ec395-…`)

1. Apr-30 "Hei dere / Fått SMS…": body text fully visible, line-height ~21px, reduced bottom padding.
2. Apr-30 "Da fikk…": same.
3. Apr-17 "Hva er dimensjon… K": unchanged.
4. Body divs with text: computed line-height ~21px (guard excludes them).
5. Agent purple bubbles unchanged.

Switch to build mode to apply.