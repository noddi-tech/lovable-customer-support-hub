## Root cause

The `@supports selector(:has(*))` block at `src/index.css` 289–300 zeros `line-height` on any `div:has(> br:only-child):not(:has(> :not(br)))`. The `:not(:has(> :not(br)))` guard only inspects **element** children — text nodes are invisible to it, the same blind spot that broke the prior `display: none` rule. Gmail body divs `<div>text<br></div>` therefore match, and every line in the bubble collapses to `line-height: 0` and overlaps.

No `:has()` + `:only-child` selector can distinguish a spacer `<div><br></div>` from a body `<div>text<br></div>` in pure CSS, so this approach must be abandoned.

## Diff (`src/index.css` 288–300)

```diff
-
-  /* Progressive enhancement: collapse pure spacer <div><br></div> via
-     line-height only (never display:none), so any over-match still renders
-     its text. The :not(:has(> :not(br))) clause excludes divs with element
-     children other than <br>; text-only over-match would just zero leading
-     between text lines, never hide content. */
-  @supports selector(:has(*)) {
-    .email-render__html-content div:has(> br:only-child):not(:has(> :not(br))) {
-      line-height: 0 !important;
-      margin: 0 !important;
-      padding: 0 !important;
-    }
-  }
-
```

That's the entire change — delete lines 288–300 (the blank line + comment + `@supports` block). Nothing else in this file is touched.

## What still handles spacer collapsing (unchanged, already present)

- `div:empty { display: none }` (lines 282–287) — collapses true `<div></div>`.
- `br + br { display: none }` (~303) — collapses double `<br>`.
- `br { ... height: 0.3em ... }` (~308+) — keeps single `<br>` tight.

These together keep `<div><br></div>` spacers visually small without ever touching divs that contain text.

## Out of scope

`parseQuotedEmail`, `normalizeMessage`, `sanitizeEmailHTML`, STEP 2b, send pipeline, storage. No new `:has()` rules. No `line-height: 0` or `display: none` on any selector that can match a text-bearing div.

## If a paragraph-gap regression appears after removal

Only then, and as a follow-up, add a non-`:has` rule scoped to direct children, e.g. `.email-render__html-content > div { margin: 0 }`. Not part of this change unless verification step 4 fails.

## Verification (conv `3e5ec395-…`, post-build)

1. `bbac3c7c` "Hei dere / Da fikk jeg melding om at dekkene endelig er klare…" — full body visible, lines on separate rows, computed `line-height` on inner body div ≈ 18px (not 0).
2. `447a78f3` "Hei dere / Fått SMS, men ikke svar…" — full body visible, no line overlap.
3. "Ja, send gjern…/Kenneth", "Ja fint…", "Hva er dimensjon… K" — still visible, normal spacing.
4. No large blank gaps between paragraphs (spacers still collapsed by `br+br` / `br` / `div:empty`).
5. Agent purple bubbles unchanged.

Switch to build mode to apply.
