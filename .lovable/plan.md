

# Fix: Hide Quoted Forwarded Content in Customer Replies

## Problem

The customer reply from Øystein Borhaug shows the full quoted previous agent message inline (with "Fra: Noddi Support / Sendt: onsdag 25. mars..." headers), instead of hiding it behind a "Show quoted text" toggle.

**Root cause:** The `WROTE_HEADERS` regex array in `parseQuotedEmail.ts` has a Norwegian Outlook pattern (line 116) that spans 4 lines (`Fra:`, `Sendt:`, `Til:`, `Emne:` on separate lines). However, the detection code tests each line *individually* against these regexes (line 559: `lines.findIndex(line => WROTE_HEADERS.some(rx => rx.test(line.trim())))`). A multi-line regex will never match a single line, so Norwegian Outlook-style quoted headers are never detected.

## Fix

### `src/lib/parseQuotedEmail.ts`

Add single-line trigger patterns to `WROTE_HEADERS` that match standalone Norwegian/English forwarding header lines:

```typescript
const WROTE_HEADERS = [
  // English
  /^On .+ wrote:$/i,
  /^-----Original Message-----$/i,
  /^From: .+\n(?:Sent|Date): .+\n(?:To|Cc): .+\n(?:Subject|Re): .+$/i,
  // Norwegian
  /^(Den|På) .+ skrev:$/i,
  /^Fra: .+\n(?:Sendt|Dato): .+\n(?:Til|Kopi): .+\n(?:Emne|Re): .+$/i,
  /^Skrev .+:$/i,
  // Single-line triggers for Outlook-style forwarded headers (matched per-line)
  /^Fra:\s+.+$/i,        // Norwegian "From:" line
  /^From:\s+.+$/i,       // English "From:" line (standalone)
];
```

**But** this is too broad — `From:` could appear in body text. Instead, detect the pattern as a *block*: when a line matches `Fra:` or `From:`, check if the next 1-3 lines match `Sendt:/Sent:/Date:`. This confirms it's a forwarding header block, not body text.

Replace the per-line check in both Step 3 (HTML fallback, line 559) and `extractFromPlain` (line 685) with a block-aware check:

```typescript
// Find Outlook-style header blocks: Fra:/From: followed by Sendt:/Sent:/Date:
function findHeaderBlockIndex(lines: string[]): number {
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (/^(Fra|From):\s+.+/i.test(line)) {
      // Check next 1-3 lines for Sent/Date pattern
      for (let j = 1; j <= Math.min(3, lines.length - i - 1); j++) {
        const next = lines[i + j].trim();
        if (/^(Sendt|Sent|Date|Dato):\s+.+/i.test(next)) {
          return i; // This is a forwarding header block
        }
        if (next.length > 0 && !/^(To|Til|Cc|Kopi|Subject|Emne|Re):\s+/i.test(next)) {
          break; // Non-header line found, not a block
        }
      }
    }
  }
  return -1;
}
```

Then use it alongside the existing `WROTE_HEADERS` check:

```typescript
const headerIdx = lines.findIndex(l => WROTE_HEADERS.some(rx => rx.test(l.trim())));
const blockIdx = findHeaderBlockIndex(lines);
let cut = -1;
if (headerIdx > -1) cut = headerIdx;
if (blockIdx > -1 && (cut === -1 || blockIdx < cut)) cut = blockIdx;
```

### File to change

- `src/lib/parseQuotedEmail.ts` — add `findHeaderBlockIndex` helper, use it in both `extractFromHtml` (Step 3) and `extractFromPlain`

### What this achieves

- Norwegian Outlook forwarding headers ("Fra: / Sendt: / Til: / Emne:") will be detected and hidden behind a toggle
- English "From: / Sent:" blocks that weren't caught by the multi-line regex will also be detected
- No false positives: requires at least `From:` + `Sent:` on consecutive lines to trigger

