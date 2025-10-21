/**
 * Strip HTML tags and decode HTML entities from text
 * This is a frontend backup for the database strip_html_tags function
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // Create a temporary div element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Extract text content (automatically decodes HTML entities)
  let text = temp.textContent || temp.innerText || '';
  
  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Get preview text with a maximum length
 */
export function getPreviewText(text: string | null | undefined, maxLength: number = 150): string {
  const stripped = stripHtml(text);
  
  if (stripped.length <= maxLength) {
    return stripped;
  }
  
  return stripped.substring(0, maxLength) + '...';
}
