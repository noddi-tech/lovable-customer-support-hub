// 4-tier scoring scale (0–10). Used across PipelineCard, ApplicantsTable, and
// ApplicantScoringSection so the visual signal is consistent.
//
// 0–2  red     — svak / diskvalifisert
// 3–5  amber   — svak match
// 6–7  yellow  — mulig
// 8–10 green   — sterk

export type ScoreTier = 'unscored' | 'low' | 'weak' | 'maybe' | 'strong';

export function scoreTier(score: number | null | undefined): ScoreTier {
  if (score == null) return 'unscored';
  if (score <= 2) return 'low';
  if (score <= 5) return 'weak';
  if (score <= 7) return 'maybe';
  return 'strong';
}

export const TIER_LABEL: Record<ScoreTier, string> = {
  unscored: 'Ikke vurdert',
  low: 'Svak',
  weak: 'Svak match',
  maybe: 'Mulig',
  strong: 'Sterk',
};

// Solid background variants — readable across light/dark surfaces.
export const TIER_SOLID_BG: Record<ScoreTier, string> = {
  unscored: 'bg-muted',
  low: 'bg-red-500',
  weak: 'bg-amber-500',
  maybe: 'bg-yellow-400',
  strong: 'bg-green-500',
};

// Soft pill (light bg + dark text) — for table cells / chips on white surfaces.
export const TIER_PILL: Record<ScoreTier, string> = {
  unscored: 'bg-muted text-muted-foreground border-border',
  low: 'bg-red-100 text-red-700 border-red-200',
  weak: 'bg-amber-100 text-amber-700 border-amber-200',
  maybe: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  strong: 'bg-green-100 text-green-700 border-green-200',
};

// Plain text colour (table sortable column).
export const TIER_TEXT: Record<ScoreTier, string> = {
  unscored: 'text-muted-foreground',
  low: 'text-red-600',
  weak: 'text-amber-600',
  maybe: 'text-yellow-700',
  strong: 'text-green-600',
};

export const SCORE_FILTER_OPTIONS: Array<{ value: 'all' | ScoreTier; label: string }> = [
  { value: 'all', label: 'Alle poeng' },
  { value: 'strong', label: 'Sterk (8–10)' },
  { value: 'maybe', label: 'Mulig (6–7)' },
  { value: 'weak', label: 'Svak match (3–5)' },
  { value: 'low', label: 'Svak (0–2)' },
  { value: 'unscored', label: 'Ikke vurdert' },
];
