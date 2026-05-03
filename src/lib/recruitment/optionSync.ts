import type { MetaFormQuestion } from '@/components/dashboard/recruitment/admin/integrations/types';

export type SelectFamily = 'single_select' | 'multi_select';

// Case-insensitive lookup. Meta's Graph API has shifted over the years
// between uppercase enums and lowercase keys — normalize to lower for lookup.
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
  if (!question?.type) return null;
  return META_TYPE_TO_FIELD_TYPE_KEY[String(question.type).toLowerCase()] ?? null;
}

/** Extract options from a Meta question, handling string | {key,value} | {value,label} shapes (case-insensitive keys). */
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
      // Normalize keys case-insensitively
      const get = (k: string): string | undefined => {
        for (const key of Object.keys(o)) {
          if (key.toLowerCase() === k) {
            const v = o[key];
            return v == null ? undefined : String(v);
          }
        }
        return undefined;
      };
      // Prefer explicit value, then key. Prefer label, then value.
      value = (get('value') ?? get('key') ?? '').trim();
      label = (get('label') ?? get('value') ?? get('key') ?? '').trim();
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
