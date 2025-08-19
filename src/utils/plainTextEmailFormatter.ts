/**
 * Enhanced plain text email formatting utilities
 */

/**
 * Linkifies URLs and email addresses in plain text
 */
export const linkifyText = (text: string): string => {
  // URL regex pattern
  const urlRegex = /(https?:\/\/[^\s<>"]{2,})/g;
  // Email regex pattern  
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  
  return text
    .replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer nofollow">$1</a>')
    .replace(emailRegex, '<a href="mailto:$1">$1</a>');
};

/**
 * Converts quoted lines (starting with >) into structured blockquote sections
 */
export const processQuotedLines = (text: string): string => {
  const lines = text.split('\n');
  const result: string[] = [];
  let currentQuote: string[] = [];
  let inQuote = false;
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trimStart();
    const isQuoteLine = trimmedLine.startsWith('>');
    
    if (isQuoteLine && !inQuote) {
      // Start of quote section
      inQuote = true;
      currentQuote = [line];
    } else if (isQuoteLine && inQuote) {
      // Continue quote section
      currentQuote.push(line);
    } else if (!isQuoteLine && inQuote) {
      // End of quote section - wrap in blockquote
      inQuote = false;
      const quoteContent = currentQuote
        .map(quoteLine => quoteLine.replace(/^\s*>+\s?/, ''))
        .join('\n');
      result.push(`<blockquote class="email-quote">${escapeHtml(quoteContent)}</blockquote>`);
      currentQuote = [];
      
      // Add current line
      if (line.trim()) {
        result.push(escapeHtml(line));
      }
    } else {
      // Regular line
      if (line.trim()) {
        result.push(escapeHtml(line));
      } else {
        result.push(''); // Preserve empty lines
      }
    }
  });
  
  // Handle any remaining quote at the end
  if (inQuote && currentQuote.length > 0) {
    const quoteContent = currentQuote
      .map(quoteLine => quoteLine.replace(/^\s*>+\s?/, ''))
      .join('\n');
    result.push(`<blockquote class="email-quote">${escapeHtml(quoteContent)}</blockquote>`);
  }
  
  return result.join('\n');
};

/**
 * Detects and marks signature sections for collapsing
 */
export const processSignature = (text: string): string => {
  // Common signature delimiters
  const signatureDelimiters = [
    /\n-- \n/,           // Standard email signature delimiter
    /\n--\n/,            // Alternative delimiter
    /\n\s*--\s*\n/,      // Delimiter with whitespace
  ];
  
  for (const delimiter of signatureDelimiters) {
    const match = text.match(delimiter);
    if (match && match.index !== undefined) {
      const beforeSignature = text.substring(0, match.index);
      const signature = text.substring(match.index + match[0].length);
      
      return beforeSignature + 
        `\n<div class="email-signature" data-collapsible="signature">${escapeHtml(signature)}</div>`;
    }
  }
  
  return text;
};

/**
 * Escape HTML entities in text
 */
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Main function to format plain text emails with enhanced features
 */
export const formatPlainTextEmail = (content: string): string => {
  if (!content) return '';
  
  // First, process signatures
  let processed = processSignature(content);
  
  // Then process quoted lines
  processed = processQuotedLines(processed);
  
  // Finally, linkify URLs and emails
  processed = linkifyText(processed);
  
  return processed;
};