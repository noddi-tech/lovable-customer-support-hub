import * as React from 'react';
import { cn } from '@/lib/utils';

interface MentionRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders text content with styled @mentions
 * Detects @Full Name patterns and wraps them in styled spans
 */
export const MentionRenderer: React.FC<MentionRendererProps> = ({ content, className }) => {
  // Pattern to match @mentions - captures the @ and the name (allowing spaces within the name)
  // Matches @Name until we hit another @ or end of line
  const mentionPattern = /(@[A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?=\s{2}|$|\n|@|[.,!?;:](?:\s|$))/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  // Reset lastIndex for global regex
  mentionPattern.lastIndex = 0;

  while ((match = mentionPattern.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${key++}`}>
          {content.slice(lastIndex, match.index)}
        </span>
      );
    }

    // Add the mention with styling
    const mentionText = match[1].trim();
    parts.push(
      <span
        key={`mention-${key++}`}
        className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium text-sm"
      >
        {mentionText}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${key++}`}>
        {content.slice(lastIndex)}
      </span>
    );
  }

  // If no matches found, just return the content as-is
  if (parts.length === 0) {
    return <span className={className}>{content}</span>;
  }

  return <span className={cn("whitespace-pre-wrap", className)}>{parts}</span>;
};
