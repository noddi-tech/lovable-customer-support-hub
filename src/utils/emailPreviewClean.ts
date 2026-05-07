/**
 * Clean an email preview string for compact list display.
 * - Decodes HTML entities (&nbsp; &lt; &amp; etc.)
 * - Strips HTML tags
 * - Removes "On ... wrote:" / "... skrev ... :" reply preamble + everything after
 * - Strips leading "> " quoted lines
 * - Collapses whitespace
 */
export function cleanEmailPreview(input: string | null | undefined, maxLen = 240): string {
  if (!input) return '';
  let s = String(input);

  // Strip HTML tags
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ')
       .replace(/<script[\s\S]*?<\/script>/gi, ' ')
       .replace(/<br\s*\/?>(?!\n)/gi, '\n')
       .replace(/<\/p>/gi, '\n')
       .replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  if (typeof document !== 'undefined') {
    const el = document.createElement('textarea');
    el.innerHTML = s;
    s = el.value;
  } else {
    s = s.replace(/&nbsp;/g, ' ')
         .replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>')
         .replace(/&amp;/g, '&')
         .replace(/&quot;/g, '"')
         .replace(/&#39;/g, "'");
  }

  // Cut at quoted reply preamble
  const replyMarkers = [
    /\bOn\s.+?wrote:/i,
    /\d{1,2}\.\s*\w+\s*\d{4}.*?skrev/i,
    /\bDen\s.+?skrev/i,
    /-{2,}\s*Original Message\s*-{2,}/i,
    /\bFrom:\s.+?\n?Sent:/is,
  ];
  for (const re of replyMarkers) {
    const m = s.match(re);
    if (m && m.index !== undefined) {
      s = s.slice(0, m.index);
      break;
    }
  }

  // Strip "> " quoted lines and zero-width chars
  s = s.split('\n')
       .filter(line => !/^\s*>+/.test(line))
       .join(' ');
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();

  if (s.length > maxLen) s = s.slice(0, maxLen).trimEnd() + '…';
  return s;
}
