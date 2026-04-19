export interface MergeField {
  key: string;          // {{first_name}}
  token: string;        // first_name
  label: string;        // "Søkerens fornavn"
}

export const MERGE_FIELDS: MergeField[] = [
  { key: '{{first_name}}', token: 'first_name', label: 'Søkerens fornavn' },
  { key: '{{last_name}}', token: 'last_name', label: 'Søkerens etternavn' },
  { key: '{{position_title}}', token: 'position_title', label: 'Stillingstittel' },
  { key: '{{company_name}}', token: 'company_name', label: 'Organisasjonens navn' },
  { key: '{{recruiter_name}}', token: 'recruiter_name', label: 'Navn på innlogget rekrutterer' },
  { key: '{{recruiter_email}}', token: 'recruiter_email', label: 'E-post til innlogget rekrutterer' },
  { key: '{{application_link}}', token: 'application_link', label: 'URL til søkerens profil i Navio' },
];

export const KNOWN_TOKENS = new Set(MERGE_FIELDS.map((f) => f.token));

/**
 * Substitute known {{token}} occurrences with values. Unknown tokens are
 * preserved verbatim so caller can highlight them in preview.
 */
export function substituteMergeFields(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, token) => {
    const lower = token.toLowerCase();
    if (KNOWN_TOKENS.has(lower) && values[lower] != null) {
      return values[lower];
    }
    return match;
  });
}

/**
 * Replace unknown tokens with a styled <mark> for HTML preview.
 */
export function highlightUnknownTokens(html: string): string {
  return html.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, token) => {
    const lower = token.toLowerCase();
    if (KNOWN_TOKENS.has(lower)) return match;
    return `<mark class="bg-yellow-200 text-yellow-900 px-1 rounded" title="Ukjent flettefelt — vil ikke bli erstattet ved sending.">${match}</mark>`;
  });
}
