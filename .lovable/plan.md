

# Fix: Address Missing Street Number + LICENSE_PLATE Rendering as Raw Text

## Problem 1: Addresses missing street numbers (e.g., "Slemdalsvingen, Oslo" instead of "Slemdalsvingen 65, 0374 Oslo")

The `executeLookupCustomer` function extracts stored addresses from bookings but only uses `full_address || street_name` as the label. The Noddi booking API often doesn't populate `full_address`, and `street_name` is just the street without the number. Fields like `street_number` and `zip_code` exist on the address object but aren't included in the label.

**Fix in `supabase/functions/widget-ai-chat/index.ts` (line 347-353):**

Build the label by combining `street_name`, `street_number`, `zip_code`, and `city`:

```typescript
const streetNum = b.address.street_number || '';
const streetName = b.address.street_name || '';
const zip = b.address.zip_code || '';
const city = b.address.city || '';
const label = `${streetName} ${streetNum}, ${zip} ${city}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim();

storedAddresses.set(b.address.id, {
  id: b.address.id,
  full_address: label,
  street: streetName,
  city,
  zip,
});
```

Also update the AddressSearchBlock's stored pill label format: the `label` field in `stored` will now contain the full address like "Slemdalsvingen 65, 0374 Oslo".

## Problem 2: `[LICENSE_PLATE]` renders as raw text instead of the interactive block

When the AI has no stored cars, it emits the self-closing marker `[LICENSE_PLATE]` (as instructed on line 567). However, the block now has `closingMarker: '[/LICENSE_PLATE]'` defined, which means the parser treats it as a block with a required closing tag. Without `[/LICENSE_PLATE]`, the parser hits the "malformed" branch (line 62-65 in parseMessageBlocks.ts) and renders the text literally.

**Fix: Change the prompt instruction to always use the closing tag:**

In `supabase/functions/widget-ai-chat/index.ts` (line 567), change:
```
If no stored cars, use the self-closing marker: [LICENSE_PLATE]
```
to:
```
If no stored cars, use: [LICENSE_PLATE][/LICENSE_PLATE]
```

This ensures the parser always finds both opening and closing tags, and `parseContent('')` returns `{ placeholder: 'AB 12345', stored: [] }` which renders the interactive input correctly.

## Files to Change

1. **`supabase/functions/widget-ai-chat/index.ts`** -- Two changes:
   - Fix stored address label to include street number and zip code (lines 347-353)
   - Fix LICENSE_PLATE fallback instruction to use closing tag (line 567)

2. No frontend changes needed -- both blocks already handle `stored: []` and empty inner content correctly.

## Deployment

- Redeploy `widget-ai-chat` edge function
- No frontend deployment needed
