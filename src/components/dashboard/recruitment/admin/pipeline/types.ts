export interface Stage {
  id: string;
  name: string;
  order: number;
  color: string;
  auto_email: boolean;
  auto_sms: boolean;
  is_system?: boolean;
  description?: string;
}

export const SYSTEM_STAGE_IDS = ['not_reviewed', 'hired', 'disqualified'] as const;

export const PRESET_COLORS = [
  { value: '#6B7280', label: 'Grå' },
  { value: '#3B82F6', label: 'Blå' },
  { value: '#8B5CF6', label: 'Lilla' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#EF4444', label: 'Rød' },
  { value: '#F59E0B', label: 'Gul' },
  { value: '#10B981', label: 'Grønn' },
  { value: '#14B8A6', label: 'Turkis' },
] as const;

export function slugifyStageId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return base || `stage_${Date.now()}`;
}

export function ensureUniqueStageId(base: string, existingIds: string[]): string {
  if (!existingIds.includes(base)) return base;
  let i = 2;
  while (existingIds.includes(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}
