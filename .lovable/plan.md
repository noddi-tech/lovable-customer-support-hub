# Restore paragraph breaks in customer emails

## Grep result
Single occurrence of `br + br` in the codebase:

- `src/index.css:290` — `.email-render__html-content br + br { display: none !important; }` (lines 289–292, including its `/* SPACING FIX: Collapse consecutive br tags */` comment)

No `.chat-bubble-content` variant exists. No other `br+br` rules anywhere in `src/`.

## Diff

`src/index.css` — delete lines 289–292:

```diff
-  /* SPACING FIX: Collapse consecutive br tags */
-  .email-render__html-content br + br {
-    display: none !important;
-  }
-
   /* SPACING FIX: Minimize br impact */
   .email-render__html-content br {
     content: '';
     display: block;
     margin: 0 !important;
     height: 0.3em;
   }
```

That is the entire change. Nothing else is touched.

## Untouched (explicit)
- `br { height: 0.3em }` — kept
- `div:empty { display:none }` — kept
- `line-height: 1.5` floor — kept
- `min-height: 0 / height: auto` block — kept
- `stripTrailingSpacers` in `src/utils/emailFormatting.ts` — kept (it removes trailing `<br>`/empty `<div>`/`<p>` nodes before render, so bottom padding stays clean independent of the br+br rule)
- `parseQuotedEmail`, `sanitizeEmailHTML` body logic, send pipeline, storage — untouched

## Why safe
- DB check on the Jun-2/Jun-8 Anders Kvåle message confirmed paragraphs are stored as `<br><br>` inside a single `<div dir="auto">`. The br+br rule was hiding the 2nd `<br>` of every pair, collapsing every paragraph break to one line.
- Trailing-padding cleanliness now comes from `stripTrailingSpacers` (node removal before render), which operates on the END of the body. Removing br+br only affects IN-BODY paragraph breaks — different positions, no conflict.
- `br { height: 0.3em }` stays, so a lone `<br>` (e.g. inside the numbered list 1/2/3) still renders tight; only `<br><br>` becomes a true blank line.

## Verification on conv `3e5ec395-…`
1. Jun-8 "Hei Robert / Tusen takk…": paragraphs separated by blank lines matching sender's structure. Probe: `consecutiveBrPairsInDOM > 0`; 2nd `<br>` of each pair no longer `display:none`.
2. Numbered list (1/2/3): stays tight (source uses single `<br>`).
3. Apr-30 "Hei dere / Fått SMS…" and "Da fikk…": body visible, bottom padding still clean (node-strip intact).
4. Apr-16 "Ja, send gjern…": still visible (line-height floor intact).
5. Agent purple bubbles: unchanged.

Report back: confirm blank-line paragraph rendering on Jun-8, and confirm Apr-30 bottom padding is unchanged.
