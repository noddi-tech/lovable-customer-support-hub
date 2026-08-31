/**
 * Reusable transactional email layout for outgoing agent replies.
 *
 * Produces a table-based, fully inline-styled HTML email that renders
 * consistently in Gmail, Outlook and Apple Mail. Header / footer content and
 * colors come from the per-inbox (or per-organization) email template row, so
 * every inbox / brand can have its own look without touching this file.
 */

import { FOOTER_THEME, resolveBrandTheme, type BrandTheme } from './brand-theme.ts';

export interface EmailLayoutOptions {
  /** Main message body, already HTML. */
  bodyHtml: string;
  /** Optional signature HTML rendered below the body. */
  signatureHtml?: string | null;
  /** Header markup (logo, brand name, tagline...). Empty hides the header. */
  headerContent?: string | null;
  /** Footer markup. Empty falls back to the brand name line. */
  footerContent?: string | null;
  headerBackgroundColor?: string | null;
  headerTextColor?: string | null;
  /** @deprecated footer colors are fixed (dark gray) for every brand. */
  footerBackgroundColor?: string | null;
  /** @deprecated footer colors are fixed (dark gray) for every brand. */
  footerTextColor?: string | null;
  bodyBackgroundColor?: string | null;
  bodyTextColor?: string | null;
  /** Brand / inbox name, used as a fallback header when no header content is set. */
  brandName?: string | null;
  /** Explicit brand theme; resolved from brandName when omitted. */
  brandTheme?: BrandTheme | null;
  /** Short text shown in the inbox preview line (hidden in the email body). */
  preheader?: string | null;
}

const FALLBACK = {
  bodyBg: '#FFFFFF',
  bodyText: '#1F1F1F',
  pageBg: '#F7F6FA',
  border: '#E5E7EB',
};


const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Escapes stray "<" characters that are not part of a real tag (e.g. "<3" in a
 * footer). Gmail's sanitizer treats those as an unterminated tag and can drop /
 * clip everything after them.
 */
function escapeStrayAngles(html: string): string {
  return String(html ?? '').replace(/<(?![a-zA-Z/!?])/g, '&lt;');
}

/** Converts a plain-text message body into safe HTML with line breaks preserved. */
export function plainTextToHtml(text: string): string {
  return escapeHtml(String(text ?? ''))
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '<br>');
}

/** Rough HTML -> plain text conversion for the text/plain MIME part. */
export function htmlToPlainText(html: string): string {
  return String(html ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderEmailLayout(options: EmailLayoutOptions): string {
  const theme = options.brandTheme || resolveBrandTheme(options.brandName, options.headerContent);
  // Brand colors from noddi-frontend win for the header; the template row can
  // still override them explicitly.
  const headerBg = options.headerBackgroundColor || theme.headerBg;
  const headerText = options.headerTextColor || theme.headerText;
  // Footer is always the same dark gray for every brand / inbox.
  const footerBg = FOOTER_THEME.bg;
  const footerText = FOOTER_THEME.text;
  const bodyBg = options.bodyBackgroundColor || FALLBACK.bodyBg;
  const bodyText = options.bodyTextColor || FALLBACK.bodyText;

  const headerInner = escapeStrayAngles(
    (options.headerContent && options.headerContent.trim()) ||
      (options.brandName
        ? `<span style="font-size:20px;font-weight:600;letter-spacing:0.2px;color:${headerText};">${escapeHtml(options.brandName)}</span>`
        : `<span style="font-size:20px;font-weight:600;color:${headerText};">${escapeHtml(theme.label)}</span>`),
  );

  const preheader = options.preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(
        options.preheader.slice(0, 140),
      )}</div>`
    : '';

  const header = headerInner
    ? `<tr><td align="center" bgcolor="${headerBg}" style="background:${headerBg};background-color:${headerBg};color:${headerText};padding:26px 32px;font-family:${FONT_STACK};font-size:16px;line-height:1.4;text-align:center;">${headerInner}</td></tr>`
    : '';

  const signature = options.signatureHtml?.trim()
    ? `<tr><td bgcolor="${bodyBg}" style="background-color:${bodyBg};padding:0 28px 24px 28px;font-family:${FONT_STACK};font-size:14px;line-height:1.6;color:${bodyText};"><div style="border-top:1px solid ${FALLBACK.border};padding-top:16px;">${escapeStrayAngles(
        options.signatureHtml,
      )}</div></td></tr>`
    : '';

  const footerInner = options.footerContent?.trim()
    ? escapeStrayAngles(options.footerContent)
    : `<span style="color:${footerText};">${escapeHtml(options.brandName || theme.label)}</span>`;

  const footer = `<tr><td class="email-footer" bgcolor="${footerBg}" style="background:${footerBg};background-color:${footerBg};color:${footerText};padding:24px 32px;border-top:1px solid ${FOOTER_THEME.border};font-family:${FONT_STACK};font-size:12px;line-height:1.7;text-align:center;">${footerInner}</td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta http-equiv="X-UA-Compatible" content="IE=edge" /><meta name="color-scheme" content="light only" /><meta name="supported-color-schemes" content="light only" /><title></title><style type="text/css">body{margin:0;padding:0;width:100%!important;background-color:${FALLBACK.pageBg};-webkit-text-size-adjust:100%;}img{border:0;outline:none;text-decoration:none;max-width:100%;height:auto;}a{color:${theme.accent};}table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}.email-footer a{color:${FOOTER_THEME.link}!important;text-decoration:underline;}@media only screen and (max-width:620px){.email-card{width:100%!important;border-radius:0!important;}.email-pad{padding-left:18px!important;padding-right:18px!important;}}</style></head><body style="margin:0;padding:0;background-color:${FALLBACK.pageBg};">${preheader}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${FALLBACK.pageBg}" style="background-color:${FALLBACK.pageBg};padding:32px 12px;"><tr><td align="center"><table role="presentation" class="email-card" width="600" cellpadding="0" cellspacing="0" bgcolor="${bodyBg}" style="width:600px;max-width:600px;background-color:${bodyBg};border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">${header}<tr><td class="email-pad" bgcolor="${bodyBg}" style="background-color:${bodyBg};padding:32px 32px 24px 32px;font-family:${FONT_STACK};font-size:15px;line-height:1.65;color:${bodyText};word-break:break-word;">${escapeStrayAngles(
    options.bodyHtml,
  )}</td></tr>${signature}${footer}</table></td></tr></table></body></html>`;
}

