/**
 * Supabase Storage object keys only accept a restricted ASCII character set.
 * Filenames with accents/spaces (e.g. "Snímek obrazovky.png") break uploads
 * with "Invalid key". Use this for the storage key only — keep the original
 * filename in the attachment metadata for display and download.
 */
export function sanitizeStorageFilename(filename: string | undefined | null): string {
  const raw = (filename ?? '').normalize('NFKD');

  const lastDot = raw.lastIndexOf('.');
  let base = lastDot > 0 ? raw.slice(0, lastDot) : raw;
  let ext = lastDot > 0 ? raw.slice(lastDot + 1) : '';

  const slug = (s: string) =>
    s
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^[._-]+|[._-]+$/g, '');

  base = slug(base).slice(0, 100);
  ext = slug(ext).slice(0, 12);

  if (!base) base = 'file';
  return ext ? `${base}.${ext}` : base;
}
