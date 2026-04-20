

## Plan: Fix `description` field not persisting on recruitment email templates

### Diagnosis (confirmed via audit log, not guessed)

Audit query showed every save has `description_key_present = true` but value = `null`. So the client always sends `null`, never the typed text.

Root cause in `EmailTemplateEditor.tsx` line 332:
```tsx
<Textarea {...form.register('description')} />
```
The shared `src/components/ui/textarea.tsx`:
- Defaults `emojiAutocomplete` to `true`, so it renders `EmojiAutocompleteInput` instead of a real `<textarea>`.
- That branch silently drops the forwarded `ref` from `register()` and synthesizes an `onChange` event without `target.name`, so react-hook-form never learns which field changed.
- The fallback raw `<textarea>` branch also fails to spread `{...props}`, so even with emoji autocomplete off, `name`/`onBlur` from `register()` would be dropped.

Net effect: RHF's `description` value stays at its default (`''`), and `useUpdateTemplate` / `useCreateTemplate` convert `''` to `null` via `description: values.description || null`.

### Fix (surgical, two files)

#### 1. `src/components/dashboard/recruitment/admin/templates/EmailTemplateEditor.tsx`

Stop relying on `register()` for the description `Textarea`. Match the same controlled pattern already used for `subject`, `body`, `stage_trigger`, and `is_active` in this file:

- Disable emoji autocomplete (not wanted in a structured admin description field).
- Drive value from `watched.description` and update via `form.setValue('description', ..., { shouldDirty: true, shouldValidate: true })`.

```tsx
<Textarea
  id="tpl-desc"
  rows={2}
  maxLength={200}
  emojiAutocomplete={false}
  value={watched.description ?? ''}
  onChange={(e) =>
    form.setValue('description', e.target.value, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }
  placeholder="Kort notat om hva malen brukes til..."
/>
```

This is the same fix shape used elsewhere in the file, keeps RHF as the source of truth, and avoids the broken `register`-on-Textarea pathway entirely.

#### 2. `src/components/dashboard/recruitment/admin/templates/types.ts` (tiny zod tweak)

`templateFormSchema.description` is `z.string().max(200).nullable().optional()`. With `value={watched.description ?? ''}`, the field will produce `''` (never `null`) in the form payload, which is fine. No schema change strictly required, but for clarity coerce empty to null at submit time in `useEmailTemplate.ts` (already done — keeps current behaviour).

No changes to `useEmailTemplate.ts`, the mutation, or the DB are needed.

### Why not "fix the shared Textarea component"

Tempting, but out of scope and risky:
- `Textarea` is used widely across the app (notes, replies, AI prompts) where emoji autocomplete is desired and parents already pass `value`/`onChange` controlled.
- Changing the default of `emojiAutocomplete` or the spread behaviour could alter behaviour in dozens of call sites with no test coverage.
- The recruitment editor already uses the controlled pattern for every other field; aligning `description` with that pattern is the smallest change that guarantees correctness.

A separate follow-up could harden `Textarea` to forward `register()` correctly (spread `{...props}`, attach `ref` even in the emoji branch via a forwarding callback ref). That's worth doing later but should not be bundled with this bug fix.

### Verification

1. Open `/admin/recruitment` → tab E-postmaler → edit an existing template.
2. Type something in Beskrivelse → click Lagre endringer → toast "Mal oppdatert".
3. Re-run the audit query:
   ```sql
   SELECT new_value->>'name' AS name, new_value->>'description' AS description
   FROM recruitment_settings_audit
   WHERE entity_type = 'email_template'
   ORDER BY created_at DESC LIMIT 3;
   ```
   The latest row should now show the typed description string, not NULL.
4. Reload the page, reopen the same template — the description value persists in the field.
5. Create a new template with a description → same expectation in audit + reload.
6. Clear the description in an existing template → save → audit shows `description = null` (because the mutation maps `''` to `null`, which is the desired "cleared" semantic).
7. The list view's description preview reflects the change.

### Files touched

- `src/components/dashboard/recruitment/admin/templates/EmailTemplateEditor.tsx` (description field rewired to controlled pattern)

That's the entire fix.

