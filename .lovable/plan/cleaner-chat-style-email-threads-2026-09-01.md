# Cleaner chat-style email threads

Your pasted plan is the right architecture — and this project already implements about 80% of it with hand-rolled code. The work is not to rebuild the pipeline, it is to replace the weakest hand-rolled layer (quote and signature stripping) with battle-tested libraries, behind a toggle, without touching threading or storage.

## What already exists here

- Per-message storage (inbound and outbound are separate rows) — the stable model your note recommends. No change.
- Header-based threading: outgoing replies already set `In-Reply-To` and a full `References` chain (`send-reply-email`), and inbound matching uses multiple message IDs. `src/lib/threadTree.ts` builds a JWZ-style tree. No change.
- Chat-bubble rendering: `MessageCard` / `ProgressiveMessagesList` on desktop, `MobileEmailMessageCard` on mobile, with a "show quoted" expander that keeps the original body.
- Sanitization: DOMPurify via `src/utils/htmlSanitizer.ts`.
- Quote/signature stripping: `src/lib/parseQuotedEmail.ts` (819 lines of regex heuristics). This is the weak part — the Outlook `Fra:/Sendt:` blocks, legal disclaimers and mailing-list footers it misses are exactly the cases you're complaining about.

So: skip PostalMime (raw MIME is already parsed server-side into rows) and skip your `groupIntoThreads` (headers are already handled). Focus on cleaning.

## What to build

### 1. A library-backed cleaner behind a feature flag

New `src/lib/emailClean.ts` exposing one function used by `normalizeMessage`:

```
cleanBody({ html, text }) -> { visibleHtml, visibleText, removedHtml, confidence }
```

Order of operations:
1. HTML path: `@u22n/mailtools` `parseMessage(html, { cleanQuotations: true, cleanSignatures: true, noRemoteContent: true })`.
2. Plain-text path: `email-reply-parser` for the visible turn.
3. Norwegian/Outlook second pass: keep the existing `Fra:/Sendt:/Til:/Emne:` and `Den … skrev:` detectors from `parseQuotedEmail.ts` as a post-step — the libraries do not cover these well.
4. Safety net: if the cleaned result is empty or under ~15 characters while the original had real content, fall back to the current output and mark `confidence: 'low'`.
5. Always DOMPurify the result through `sanitizeEmailHTML`.

Nothing is deleted from the stored row; `removedHtml` powers the existing "show quoted / show original" expander.

### 2. Flag and rollout

`ENABLE_LIB_EMAIL_CLEAN` in `src/lib/parseQuotedEmail.ts` alongside the existing flags, defaulting off, plus a `?cleanv2=1` URL override so you can compare bubbles side by side on real threads before flipping it on. This matches the project's 99.9% uptime constraint — no big-bang swap.

### 3. Attachments as chips, not HTML

Where attachments are still rendered inline inside the body HTML, surface them as chips on the bubble using the existing attachment components, so stripping the body never hides a file.

### 4. Tests

Extend `src/lib/__tests__/` with a fixture set of real-shaped bodies: Gmail `On … wrote:`, Outlook Norwegian `Fra:/Sendt:`, "Sendt fra min iPhone", a long legal disclaimer, and a Google Groups forward. Each asserts the visible turn survives and the noise is removed. This is the guard that stops a heuristic change from silently blanking bubbles.

## Explicitly not doing

- Not splitting one giant quoted body into multiple synthetic bubbles. That path was already tried here (`ENABLE_QUOTED_EXTRACTION`) and disabled because it produced duplicates. It stays off.
- Not changing threading, storage, or the send path.
- Not adding `postal-mime` — MIME parsing already happens in the inbound edge functions.

## Technical notes

- New deps: `@u22n/mailtools`, `email-reply-parser`. Both are client-safe; DOMPurify is already installed.
- Integration point is `normalizeMessage()` in `src/lib/normalizeMessage.ts` (`visibleBody` / `quotedBlocks`), so every surface — desktop cards, mobile cards, previews, list previews — improves at once.
- `cleanEmailPreview` in `src/utils/emailPreviewClean.ts` should reuse the same cleaner so list previews match the thread view.
- Keep the existing parse cache in front of the new cleaner; the libraries are heavier than the regexes.
