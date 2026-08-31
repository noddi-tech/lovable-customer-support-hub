/**
 * Supabase Storage object keys only accept a restricted ASCII character set.
 * Filenames coming from email (e.g. "Snímek obrazovky 2026-08-31.png") break
 * uploads with "Invalid key", which silently drops attachments.
 *
 * Use this to build the *key*; always keep the original filename in metadata
 * so the UI can still display/download it under its real name.
 */
export function sanitizeStorageFilename(filename: string | undefined | null): string {
  const raw = (filename ?? '').normalize('NFKD');

  // Split extension so we can preserve it after slugging.
  const lastDot = raw.lastIndexOf('.');
  let base = lastDot > 0 ? raw.slice(0, lastDot) : raw;
  let ext = lastDot > 0 ? raw.slice(lastDot + 1) : '';

  const slug = (s: string) =>
    s
      .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^[._-]+|[._-]+$/g, '');

  base = slug(base).slice(0, 100);
  ext = slug(ext).slice(0, 12);

  if (!base) base = 'file';
  return ext ? `${base}.${ext}` : base;
}
