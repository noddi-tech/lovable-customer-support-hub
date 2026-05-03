## Adjust option-sync to match real Meta API shape

Meta's form-builder questions arrive as `type: "CUSTOM"` with an `options` array of `{key, value}`. Update `src/lib/recruitment/optionSync.ts` only — no other files affected.

### `inferFieldTypeKeyFromMeta`

Add a standard-field guard and a CUSTOM/has-options heuristic on top of the existing canonical map.

```ts
const META_STANDARD_TYPES = new Set([
  'email', 'full_name', 'first_name', 'last_name', 'phone', 'phone_number',
]);

export function inferFieldTypeKeyFromMeta(question) {
  const hasOptions =
    !!question?.options && Array.isArray(question.options) && question.options.length > 0;
  if (!question?.type) return hasOptions ? 'single_select' : null;
  const t = String(question.type).toLowerCase();
  if (META_STANDARD_TYPES.has(t)) return null;        // standard field, not custom
  const mapped = META_TYPE_TO_FIELD_TYPE_KEY[t];     // RADIO/CHECKBOX/etc.
  if (mapped) return mapped;
  // CUSTOM (or any unknown) + options → default single_select; user can flip to multi in dialog.
  return hasOptions ? 'single_select' : null;
}
```

Existing `META_TYPE_TO_FIELD_TYPE_KEY` (radio/dropdown/checkbox/…) stays for future-proofing.

### `extractMetaOptions`

Meta canonical shape is `{key: <slug>, value: <human text>}`. Webhook lead payloads send the slug, so our internal `value` must be the slug and the label is the human text.

Update the object branch:

```ts
const key = get('key');
const val = get('value');
const lbl = get('label');
if (key !== undefined) {
  // Meta canonical: key = slug → our value; value = human label
  value = key.trim();
  label = (lbl ?? val ?? key).trim();
} else {
  // Legacy {value,label} shape
  value = (val ?? '').trim();
  label = (lbl ?? val ?? '').trim();
}
```

Plain-string and dedupe logic unchanged.

### Untouched

- `findMissingOptions`, `mergeOptions` — still operate on `value` equality, which now correctly compares slugs.
- `CustomFieldDialog.tsx`, `FormMappingEditor.tsx` — no API changes; consume the same helper signatures.

### Validation

`bunx tsc --noEmit` clean. No runtime behavior change for forms that still return RADIO/CHECKBOX enums; CUSTOM-typed forms now correctly pre-fill as single_select with slug-based values.
