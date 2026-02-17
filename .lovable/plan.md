

# Translate All Remaining English Strings + Fix YES/NO Marker Visibility

## Problem

Two issues visible in the screenshot:

1. **Raw `[YES_NO]` and `[/YES_NO]` markers are showing** as plain text above and below the interactive buttons. This means the parser is not stripping these markers from the surrounding text block -- likely the AI is outputting the markers on separate lines from the question text, causing them to appear as leftover text.

2. **English button labels**: The YesNo buttons say "Yes" and "No" plus the checkmark icon says "Confirm" and "Cancel" in ConfirmBlock, and several other blocks have English strings.

## Changes

### 1. `src/widget/components/blocks/YesNoBlock.tsx`
- Line 21/33: `'Yes'` -> `'Ja'` (button label)
- Line 35/47: `'No'` -> `'Nei'` (button label)
- Note: The `handleSelect` sends `'Yes'`/`'No'` as the action value -- change these to `'Ja'`/`'Nei'` as well since the AI receives this as user input
- Preview component (lines 60, 64): `Yes` -> `Ja`, `No` -> `Nei`

### 2. `src/widget/components/blocks/ConfirmBlock.tsx`
- Line 32: `Confirm` -> `Bekreft`
- Line 45: `Cancel` -> `Avbryt`
- Preview (lines 56-57): Same translations

### 3. `src/widget/components/blocks/EmailInputBlock.tsx`
- Line 25: `'Please enter a valid email address'` -> `'Vennligst skriv inn en gyldig e-postadresse'`

### 4. `src/widget/components/blocks/TextInputBlock.tsx`
- Line 7: `'Type here...'` -> `'Skriv her...'`
- Preview line 48: Same

### 5. `src/widget/components/blocks/LicensePlateBlock.tsx`
- Line 45: `'Vehicle lookup is temporarily unavailable, please try again later'` -> `'Kjøretøyoppslag er midlertidig utilgjengelig, vennligst prøv igjen senere'`
- Line 47: `'Car not found'` -> `'Bil ikke funnet'`
- Line 65: `'Network error'` -> `'Nettverksfeil'`

### 6. `src/widget/components/blocks/AddressSearchBlock.tsx`
- Line 157: `'We deliver here!'` -> `'Vi leverer her!'`
- Line 157: `"Sorry, we don't deliver here yet"` -> `'Beklager, vi leverer ikke her ennå'`
- Line 172: `'Checking delivery area...'` -> `'Sjekker leveringsområde...'`
- Line 226: `'Search address...'` -> `'Søk etter adresse...'`

### 7. `src/widget/components/blocks/TimeSlotBlock.tsx`
- Lines 7-8: English day/month names -> Norwegian:
  - `['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']` -> `['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør']`
  - `['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']` -> `['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des']`

### 8. Fix raw `[YES_NO]`/`[/YES_NO]` marker text leaking

**File**: `src/widget/utils/parseMessageBlocks.ts`

The parser already handles markers, but the issue is that the AI outputs the markers on separate lines from the surrounding text. When the parser splits content, leftover text containing raw `[YES_NO]` or `[/YES_NO]` as standalone lines can slip through as text blocks.

Add a post-processing step after parsing: strip any text block that is only a raw marker tag (e.g., `[YES_NO]`, `[/YES_NO]`). This ensures stray markers never render as visible text.

At the end of `parseMessageBlocks`, before returning, filter text blocks:
```typescript
// Strip text blocks that are just leftover marker tags
const markerTags = new Set(MARKERS.flatMap(m => [m.tag, m.closingTag].filter(Boolean)));
return blocks.filter(b => {
  if (b.type !== 'text') return true;
  const trimmed = (b as any).content?.trim();
  return trimmed && !markerTags.has(trimmed);
});
```

## Summary

| File | Change |
|------|--------|
| `YesNoBlock.tsx` | Yes/No -> Ja/Nei |
| `ConfirmBlock.tsx` | Confirm/Cancel -> Bekreft/Avbryt |
| `EmailInputBlock.tsx` | Email validation error -> Norwegian |
| `TextInputBlock.tsx` | Placeholder -> Norwegian |
| `LicensePlateBlock.tsx` | Error messages -> Norwegian |
| `AddressSearchBlock.tsx` | Delivery messages, placeholder -> Norwegian |
| `TimeSlotBlock.tsx` | Day/month names -> Norwegian |
| `parseMessageBlocks.ts` | Strip stray marker tags from text blocks |

