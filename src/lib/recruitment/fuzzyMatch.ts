// Norwegian-aware fuzzy match for matching template question patterns
// against actual Meta form question text.
//
// - lowercases
// - folds æ→ae, ø→oe, å→aa
// - strips common Norwegian stopwords (i, av, en, et, til, og, eller, for)
// - collapses whitespace + strips punctuation
// - then computes Levenshtein distance normalized to [0,1]
//
// score = 1 - distance / max(lenA, lenB).  threshold default 0.7.

const STOPWORDS = new Set([
  'i', 'av', 'en', 'et', 'til', 'og', 'eller', 'for', 'som', 'er', 'på', 'pa',
  'the', 'a', 'an', 'of', 'to', 'and', 'or',
]);

export function normalizeNo(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFC')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOPWORDS.has(w))
    .join(' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[b.length];
}

export function similarityNo(a: string, b: string): number {
  const na = normalizeNo(a);
  const nb = normalizeNo(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const max = Math.max(na.length, nb.length);
  return 1 - dist / max;
}

export function findBestMatch<T>(
  needle: string,
  haystack: T[],
  textOf: (item: T) => string,
  threshold = 0.7,
): { item: T; score: number } | null {
  let best: { item: T; score: number } | null = null;
  for (const item of haystack) {
    const score = similarityNo(needle, textOf(item));
    if (score >= threshold && (!best || score > best.score)) {
      best = { item, score };
    }
  }
  return best;
}
