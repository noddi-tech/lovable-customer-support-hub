

# Fix: LICENSE_PLATE Rendering Failure + Address Text Clutter

## Root Cause Analysis

### Issue 1: LICENSE_PLATE shows as raw text
The screenshot shows the AI outputting:
```
[LICENSE_PLATE]{"stored":[]}
[LICENSE_PLATE]
```
Note: the "closing" tag is `[LICENSE_PLATE]` -- missing the `/`. The parser looks for `[/LICENSE_PLATE]`, doesn't find it, and falls to the "malformed" case (line 76-79 of `parseMessageBlocks.ts`), rendering everything as literal text.

Prompt fixes have been attempted 3+ times and the AI model keeps getting it wrong. The only reliable fix is to make the **parser itself resilient** to this common mistake.

### Issue 2: AI writes address text before ADDRESS_SEARCH marker
Multiple prompt iterations have failed to stop the AI from writing "Her er adressene dine:" before the marker. The prompt needs one more targeted reinforcement, but we should also add parser-level handling so any text before a marker is at least separated cleanly.

---

## Changes

### Change 1: Parser resilience for wrong closing tags (`parseMessageBlocks.ts`)

Add a pre-processing step that fixes the most common AI mistake: using `[TAG]` instead of `[/TAG]` as a closing tag.

For each block with a closing marker, scan the content for the pattern where the opening tag appears twice (once with content, once without) and the correct closing tag is missing. Replace the second occurrence with the proper closing tag.

For example, transform:
```
[LICENSE_PLATE]{"stored":[]}
[LICENSE_PLATE]
```
into:
```
[LICENSE_PLATE]{"stored":[]}[/LICENSE_PLATE]
```

Logic: For each block type with a closing marker, use a regex that matches `[TAG]...content...[TAG]` (where the second `[TAG]` has no content or is followed by whitespace/end) and replaces the second `[TAG]` with `[/TAG]`.

### Change 2: Prompt reinforcement for LICENSE_PLATE closing tag (`widget-ai-chat/index.ts`)

Update the LICENSE_PLATE marker instruction (lines 1008-1012) to be even more explicit about the closing tag syntax:

```
9. LICENSE PLATE - render a license plate input with car lookup:
Output ONLY the marker. The closing tag MUST be [/LICENSE_PLATE] (with a forward slash /).
CORRECT: [LICENSE_PLATE]{"stored":[...]}[/LICENSE_PLATE]
WRONG: [LICENSE_PLATE]{"stored":[...]}[LICENSE_PLATE]  (missing the / in closing tag)
Without stored cars: [LICENSE_PLATE][/LICENSE_PLATE]
```

### Change 3: Stronger ADDRESS_SEARCH prompt enforcement (`widget-ai-chat/index.ts`)

Update the ADDRESS_SEARCH instruction (lines 1001-1006) and the hardcoded fallback flow (line 955) to add a one-liner hard constraint:

In the hardcoded fallback (line 955), add after the existing stored data instruction:
```
10. When it's time to collect an address, your ENTIRE message must be ONLY the [ADDRESS_SEARCH] marker. Do not greet, do not describe, do not list addresses. Just the marker.
11. When it's time to collect a license plate, your ENTIRE message must be ONLY the [LICENSE_PLATE] marker. Do not describe, do not explain. Just the marker.
```

### Change 4: Same enforcement in dynamic flow instructions (`widget-ai-chat/index.ts`)

In the dynamic flow field instruction for `address` (around line 576-578), add:
```
Your ENTIRE response must be ONLY the [ADDRESS_SEARCH] marker. No greeting, no description, no list of addresses before or after it.
```

Similarly for `license_plate` (around line 582-586):
```
Your ENTIRE response must be ONLY the [LICENSE_PLATE] marker. No description, no explanation before or after it.
```

---

## Technical Details

### Parser fix pseudocode (Change 1):
```typescript
// In parseMessageBlocks, before the main parsing loop:
// Fix common AI mistake: [TAG]content[TAG] -> [TAG]content[/TAG]
for (const marker of MARKERS) {
  if (marker.hasClosing && marker.closingTag) {
    const openEsc = marker.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const closeEsc = marker.closingTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // If closing tag is NOT present but the opening tag appears 2+ times,
    // replace the last occurrence of the opening tag with the closing tag
    if (!normalized.includes(marker.closingTag) && 
        normalized.split(marker.tag).length > 2) {
      const lastIdx = normalized.lastIndexOf(marker.tag);
      normalized = normalized.substring(0, lastIdx) + 
                   marker.closingTag + 
                   normalized.substring(lastIdx + marker.tag.length);
    }
  }
}
```

This is safe because:
- It only activates when the correct closing tag is completely absent
- It only activates when the opening tag appears 2+ times
- It replaces the LAST occurrence of the opening tag with the closing tag

---

## Deployment
- Redeploy `widget-ai-chat` edge function (prompt changes)
- Frontend changes (parseMessageBlocks.ts) auto-deploy

