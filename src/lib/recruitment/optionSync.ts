import type { MetaFormQuestion } from '@/components/dashboard/recruitment/admin/integrations/types';

export type SelectFamily = 'single_select' | 'multi_select';

// Standard-field types Meta returns for built-in questions. These are never
// custom fields — they map to standard_field targets in our editor.
const META_STANDARD_TYPES = new Set([
  'email',
  'full_name',
  'first_name',
  'last_name',
  'phone',
  'phone_number',
]);

// Case-insensitive lookup. Meta historically returned canonical enums
// (RADIO/DROPDOWN/CHECKBOX) for some forms; keep as fallback. Modern
// form-builder questions arrive as type === "CUSTOM" with an options array.
const META_TYPE_TO_FIELD_TYPE_KEY: Record<string, SelectFamily> = {
  radio: 'single_select',
  dropdown: 'single_select',
  select: 'single_select',
  single_choice: 'single_select',
  checkbox: 'multi_select',
  checkboxes: 'multi_select',
  multiple_choice: 'multi_select',
  multi_select: 'multi_select',
};

export function inferFieldTypeKeyFromMeta(
  question: MetaFormQuestion | null | undefined,
): SelectFamily | null {
  const hasOptions =
    !!question?.options && Array.isArray(question.options) && question.options.length > 0;
  if (!question?.type) return hasOptions ? 'single_select' : null;
  const t = String(question.type).toLowerCase();
  if (META_STANDARD_TYPES.has(t)) return null;
  const mapped = META_TYPE_TO_FIELD_TYPE_KEY[t];
  if (mapped) return mapped;
  // CUSTOM (or any unknown type) with options → default to single_select; user
  // can switch to multi_select in the dialog if their form is multi-select.
  return hasOptions ? 'single_select' : null;
}

/**
 * Extract options from a Meta question.
 *
 * Meta canonical shape is `{key, value}` where:
 *   - key   = snake_case slug Meta normalizes from the answer. The lead
 *             webhook payload sends THIS slug as the answer value, so it
 *             must become our internal `value`.
 *   - value = human-readable answer text → becomes the label.
 *
 * Also handles legacy `{value,label}` and plain string shapes for resilience.
 */
export function extractMetaOptions(
  question: MetaFormQuestion | null | undefined,
): Array<{ value: string; label: string }> {
  if (!question?.options || !Array.isArray(question.options)) return [];
  const out: Array<{ value: string; label: string }> = [];
  const seen = new Set<string>();
  for (const rawAny of question.options as unknown[]) {
    const raw = rawAny as unknown;
    let value = '';
    let label = '';
    if (typeof raw === 'string') {
      value = (raw as string).trim();
      label = value;
    } else if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      const get = (k: string): string | undefined => {
        for (const key of Object.keys(o)) {
          if (key.toLowerCase() === k) {
            const v = o[key];
            return v == null ? undefined : String(v);
          }
        }
        return undefined;
      };
      const key = get('key');
      const val = get('value');
      const lbl = get('label');
      if (key !== undefined) {
        // Meta canonical: key = slug (our value), value = human label
        value = key.trim();
        label = (lbl ?? val ?? key).trim();
      } else {
        // Legacy {value,label} shape
        value = (val ?? '').trim();
        label = (lbl ?? val ?? '').trim();
      }
    }
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push({ value, label: label || value });
  }
  return out;
}


/** Returns Meta options whose `value` is missing from the custom field's options. */
export function findMissingOptions(
  customField: { options: Array<{ value: string }> | null } | null | undefined,
  question: MetaFormQuestion | null | undefined,
): Array<{ value: string; label: string }> {
  const meta = extractMetaOptions(question);
  if (meta.length === 0) return [];
  const existing = new Set((customField?.options ?? []).map((o) => o.value));
  return meta.filter((m) => !existing.has(m.value));
}

/** Merge existing options with missing ones, preserving existing order. */
export function mergeOptions(
  existing: Array<{ value: string; label_no?: string }> | null | undefined,
  missing: Array<{ value: string; label: string }>,
): Array<{ value: string; label_no: string }> {
  const base = (existing ?? []).map((o) => ({
    value: o.value,
    label_no: o.label_no ?? o.value,
  }));
  for (const m of missing) {
    base.push({ value: m.value, label_no: m.label || m.value });
  }
  return base;
}
