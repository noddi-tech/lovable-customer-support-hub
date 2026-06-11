## Grep results (full src scan for `line-height: 0`, `br:only-child`, `:has(`)

| Location | Rule | Verdict |
|---|---|---|
| `src/index.css:1622–1626` | `@supports selector(:has(*)) { .chat-bubble-content .email-render__html-content div:has(> br:only-child):not(:has(> :not(br))) { line-height: 0 !important } }` | **THE BUG — remove.** Duplicate of the block removed earlier (~line 290); this second copy survived. Matches Gmail body divs `<div>text<br></div>` because the guard ignores text nodes. Invisible to the `el.matches()` scan exactly as diagnosed. |
| `src/index.css:492` | `table/tbody/thead/tr { line-height: 0 }` | Keep — cannot match a text-bearing div; td/th restore 1.3 at line 501. |
| `src/index.css:524` | `td:empty, th:empty` | Keep — empty cells only. |
| `src/index.css:532` | `td[bgcolor]:not([class])` | Keep — spacer cells only. |
| `src/index.css:1406–1407` | `pre:has(code)` | Keep — unrelated, harmless. |
| `table.tsx:76,90`, `calendar.tsx:37` | Tailwind `[&:has([role=checkbox])]` etc. | Keep — unrelated UI. |

No other `line-height: 0` or `br:only-child` occurrences exist in src.

## Diff (`src/index.css`)

**1. Delete lines 1620–1626** (comment + entire `@supports` block):

```diff
-/* Progressive enhancement: where :has() is supported, re-collapse pure
-   br-only spacer divs so they don't grow from the rule above. */
-@supports selector(:has(*)) {
-  .chat-bubble-content .email-render__html-content div:has(> br:only-child):not(:has(> :not(br))) {
-    line-height: 0 !important;
-  }
-}
```

**2. Replace the existing floor at 1614–1618 with the requested explicit, non-:has floor** (line-height 1.5, covering root, divs, and p):

```diff
-.chat-bubble-content .email-render__html-content div:not(:empty) {
-  line-height: 1.3 !important;
-  height: auto !important;
-  min-height: 0;
-}
+/* LINE-HEIGHT FLOOR: email body text can never render at line-height 0,
+   regardless of any missed rule. No :has() — visible to rule scans. */
+.chat-bubble-content .email-render__html-content,
+.chat-bubble-content .email-render__html-content div,
+.chat-bubble-content .email-render__html-content p {
+  line-height: 1.5 !important;
+}
+.chat-bubble-content .email-render__html-content div {
+  height: auto !important;
+  min-height: 0;
+}
```

Spacer tightness still handled by existing untouched rules: `div:empty { display:none }`, `br + br { display:none }`, `br { height: 0.3em }`.

## Out of scope

`parseQuotedEmail`, `normalizeMessage`, `sanitizeEmailHTML`, send pipeline, storage. No new `:has()` rules anywhere.

## Verification (conv `3e5ec395-…`, computed values via live preview)

1. Inner body div of `bbac3c7c` ("Da fikk jeg melding…"): computed `line-height` ≈ 21px (14px × 1.5, NOT 0), `offsetHeight` > 0, lines on separate rows.
2. `447a78f3` ("Fått SMS…"): readable, no overlap.
3. "Ja, send gjern…", "Ja fint…", "Hva er dimensjon… K": readable, normal spacing.
4. No large spacer gaps (br rules + div:empty unchanged).
5. Agent purple bubbles unchanged.

Switch to build mode to apply.