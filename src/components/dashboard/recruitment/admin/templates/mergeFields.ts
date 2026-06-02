export interface MergeField {
  key: string;          // {{first_name}}
  token: string;        // first_name
  label: string;        // "Søkerens fornavn"
}

export const MERGE_FIELDS: MergeField[] = [
  { key: '{{first_name}}', token: 'first_name', label: 'Søkerens fornavn' },
  { key: '{{last_name}}', token: 'last_name', label: 'Søkerens etternavn' },
  { key: '{{position_title}}', token: 'position_title', label: 'Stillingstittel' },
  { key: '{{company_name}}', token: 'company_name', label: 'Organisasjonens navn (alias)' },
  { key: '{{organization_name}}', token: 'organization_name', label: 'Organisasjonens navn' },
  { key: '{{recruiter_name}}', token: 'recruiter_name', label: 'Navn på innlogget rekrutterer' },
  { key: '{{recruiter_email}}', token: 'recruiter_email', label: 'E-post til innlogget rekrutterer' },
  { key: '{{application_link}}', token: 'application_link', label: 'URL til søkerens profil i Navio' },
  { key: '{{form_url}}', token: 'form_url', label: 'URL til kandidatskjema' },
  { key: '{{expires_at}}', token: 'expires_at', label: 'Utløpstidspunkt (formatert)' },
  { key: '{{brand_color}}', token: 'brand_color', label: 'Merkevarefarge (hex)' },
];

export const KNOWN_TOKENS = new Set(MERGE_FIELDS.map((f) => f.token));

/** Special placeholder: {{cta_button:LABEL:URL_VAR}} — rendered server-side. */
const CTA_BUTTON_RE = /\{\{\s*cta_button\s*:\s*([^:}]+?)\s*:\s*([a-z_]+)\s*\}\}/gi;

/**
 * Substitute known {{token}} occurrences with values. Unknown tokens are
 * preserved verbatim so caller can highlight them in preview.
 * Also previews {{cta_button:LABEL:URL_VAR}} as a styled button.
 */
export function substituteMergeFields(
  template: string,
  values: Record<string, string>,
): string {
  const withButtons = template.replace(CTA_BUTTON_RE, (_m, label: string, urlVar: string) => {
    const urlKey = String(urlVar).toLowerCase().trim();
    const url = values[urlKey] || '#';
    const brand = values['brand_color'] || '#111827';
    const safeLabel = String(label).trim()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<a href="${url}" style="display:inline-block;padding:12px 20px;background:${brand};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">${safeLabel}</a>`;
  });
  return withButtons.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, token) => {
    const lower = token.toLowerCase();
    if (KNOWN_TOKENS.has(lower) && values[lower] != null) {
      return values[lower];
    }
    return match;
  });
}

/**
 * Replace unknown tokens with a styled <mark> for HTML preview.
 * Skips the cta_button placeholder (already rendered by substituteMergeFields).
 */
export function highlightUnknownTokens(html: string): string {
  return html.replace(/\{\{\s*([a-z_]+)(?:\s*:[^}]*)?\s*\}\}/gi, (match, token) => {
    const lower = token.toLowerCase();
    if (lower === 'cta_button') return match;
    if (KNOWN_TOKENS.has(lower)) return match;
    return `<mark class="bg-yellow-200 text-yellow-900 px-1 rounded" title="Ukjent flettefelt — vil ikke bli erstattet ved sending.">${match}</mark>`;
  });
}
