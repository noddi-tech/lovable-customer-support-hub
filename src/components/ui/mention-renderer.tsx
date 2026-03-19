import * as React from 'react';
import { cn } from '@/lib/utils';

interface MentionRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders text content with styled @mentions
 * Supports @[Full Name] delimiter format (primary) and legacy @FullName heuristic (fallback)
 */
export const MentionRenderer: React.FC<MentionRendererProps> = ({ content, className }) => {
  // Primary pattern: explicit delimiters @[Name Here]
  const bracketPattern = /@\[([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)\]/g;
  // Legacy pattern: capitalized words after @ (fallback for old messages)
  const legacyPattern = /@([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+)*)/g;

  const useBrackets = bracketPattern.test(content);
  const mentionPattern = useBrackets ? bracketPattern : legacyPattern;

  // Reset lastIndex after test()
  mentionPattern.lastIndex = 0;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = mentionPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${key++}`}>
          {content.slice(lastIndex, match.index)}
        </span>
      );
    }

    const name = match[1].trim();
    parts.push(
      <span
        key={`mention-${key++}`}
        className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/15 text-primary font-semibold text-sm ring-1 ring-primary/20"
      >
        @{name}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${key++}`}>
        {content.slice(lastIndex)}
      </span>
    );
  }

  if (parts.length === 0) {
    return <span className={className}>{content}</span>;
  }

  return <span className={cn("whitespace-pre-wrap", className)}>{parts}</span>;
};
