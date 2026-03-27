

## Fix: Reduce signature logo to 40px

Change all `max-height: 80px` references for signature/inline images to `40px` across `src/index.css`:

1. **Line 377** — `.email-signature img` global rule: `80px` → `40px`
2. **Line 565** — `.email-inline-image` rule: `80px` → `40px`
3. **Line 1702** — mobile `.mobile-email-body img` rule: `80px` → `40px`

1 file, 3 line changes. Signature logos will render at half the current size.

