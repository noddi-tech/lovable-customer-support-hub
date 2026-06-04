## Amended fix — narrow whitewash override only

Single edit in `src/index.css`, lines 1563–1574. No other files touched. No parser/data/pipeline changes.

### Diff

```diff
 .chat-bubble-content .email-render__html-content *,
 .chat-bubble-content .email-render__plain-content * {
   font-family: inherit !important;
-  color: inherit !important;
+  /* Neutralize WebKit text-fill (Gmail mobile signatures override `color`
+     via -webkit-text-fill-color). Safe to always track color. Do NOT force
+     `color: inherit` here — that would flatten intentional inline colors. */
+  -webkit-text-fill-color: inherit !important;
+  text-shadow: none !important;
 }
 
+/* Override ONLY invisible / near-invisible inline text colors in email bodies.
+   Targeted whitewash list — preserves intentional inline colors. */
+.chat-bubble-content .email-render__html-content [style*="color:#fff" i],
+.chat-bubble-content .email-render__html-content [style*="color: #fff" i],
+.chat-bubble-content .email-render__html-content [style*="color:rgb(255" i],
+.chat-bubble-content .email-render__html-content [style*="color: rgb(255" i],
+.chat-bubble-content .email-render__html-content [style*="color:white" i],
+.chat-bubble-content .email-render__html-content [style*="transparent" i],
+.chat-bubble-content .email-render__html-content font[color="#ffffff" i],
+.chat-bubble-content .email-render__html-content font[color="#fff" i],
+.chat-bubble-content .email-render__html-content font[color="white" i],
+.chat-bubble-content .email-render__plain-content [style*="color:#fff" i],
+.chat-bubble-content .email-render__plain-content [style*="color: #fff" i],
+.chat-bubble-content .email-render__plain-content [style*="color:rgb(255" i],
+.chat-bubble-content .email-render__plain-content [style*="color: rgb(255" i],
+.chat-bubble-content .email-render__plain-content [style*="color:white" i],
+.chat-bubble-content .email-render__plain-content [style*="transparent" i],
+.chat-bubble-content .email-render__plain-content font[color="#ffffff" i],
+.chat-bubble-content .email-render__plain-content font[color="#fff" i],
+.chat-bubble-content .email-render__plain-content font[color="white" i] {
+  color: inherit !important;
+  -webkit-text-fill-color: inherit !important;
+  text-shadow: none !important;
+}
+
 .chat-bubble-content .email-render__html-content a,
 .chat-bubble-content .email-render__plain-content a {
   color: inherit !important;
   text-decoration: underline;
   opacity: 0.9;
 }
```

### Behavior

- Removed broad `color: inherit !important` on every descendant — intentional inline colors are preserved.
- `-webkit-text-fill-color: inherit` stays universal (safe — it should always track `color`); this alone defeats Gmail mobile's whitewash trick when `color` happens to already be readable.
- The new targeted block overrides `color` + `-webkit-text-fill-color` + `text-shadow` ONLY when the inline value is one of: `#fff`, `#ffffff`, `white`, `rgb(255…)`, `transparent`, or legacy `<font color="white|#fff|#ffffff">`.
- Anchor rule unchanged (links still inherit bubble color).

### Verification (post-build, conv `3e5ec395-…`)
1. `bbac3c7c` — full Hei dere body visible
2. `447a78f3` — full Hei dere body visible
3. Apr-16 "Ja, send gjern…/Kenneth" — visible
4. `6085fbab` — question visible, not blank
5. Agent purple bubbles + any intentionally-colored email content — unchanged

Switch to build mode to apply.