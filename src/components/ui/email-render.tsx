import React, { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeEmailHTML, formatPlainTextEmail, type EmailAttachment } from '@/utils/emailFormatting';

interface EmailRenderProps {
  content: string;
  contentType?: string;
  attachments?: EmailAttachment[];
  messageId?: string;
  className?: string;
}

interface CollapsibleSectionProps {
  children: React.ReactNode;
  buttonText: string;
  defaultCollapsed?: boolean;
  id: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  children, 
  buttonText, 
  defaultCollapsed = true,
  id 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  return (
    <div className="email-render__collapsible">
      <Button
        variant="ghost"
        size="sm"
        className="email-render__collapsible-toggle"
        onClick={toggleCollapse}
        aria-expanded={!isCollapsed}
        aria-controls={id}
      >
        <span className="text-muted-foreground text-xs">{buttonText}</span>
        {isCollapsed ? (
          <ChevronDown className="h-3 w-3 ml-1" />
        ) : (
          <ChevronUp className="h-3 w-3 ml-1" />
        )}
      </Button>
      {!isCollapsed && (
        <div 
          id={id} 
          className="email-render__collapsible-content"
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const EmailRender: React.FC<EmailRenderProps> = ({
  content,
  contentType = 'text/plain',
  attachments = [],
  messageId,
  className = ''
}) => {
  const isHTML = useMemo(() => 
    contentType.toLowerCase().includes('html') || /<[^>]+>/.test(content),
    [content, contentType]
  );

  const processedContent = useMemo(() => {
    if (isHTML) {
      return sanitizeEmailHTML(content, attachments, true, messageId);
    } else {
      return formatPlainTextEmail(content);
    }
  }, [content, isHTML, attachments, messageId]);

  const contentWithCollapsibleSections = useMemo(() => {
    if (!isHTML) {
      return processedContent;
    }

    // Parse HTML and identify sections to collapse
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processedContent;
    
    // Find and wrap quoted sections
    const quotedElements = tempDiv.querySelectorAll('blockquote');
    quotedElements.forEach((blockquote, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'collapsible-quote';
      wrapper.setAttribute('data-quote-id', `quote-${index}`);
      blockquote.parentNode?.insertBefore(wrapper, blockquote);
      wrapper.appendChild(blockquote);
    });
    
    // Find signature sections (content after "-- " delimiter)
    const textContent = tempDiv.textContent || '';
    const signatureMatch = textContent.match(/\n-- \n/);
    if (signatureMatch) {
      // This is a simplified approach - in production, you'd want more sophisticated signature detection
      const walker = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let foundSignature = false;
      const nodesToCollapse: Node[] = [];
      
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.textContent?.includes('-- ') && !foundSignature) {
          foundSignature = true;
          // Start collecting nodes after signature delimiter
          let nextNode = node.nextSibling;
          while (nextNode) {
            nodesToCollapse.push(nextNode);
            nextNode = nextNode.nextSibling;
          }
        }
      }
      
      if (nodesToCollapse.length > 0) {
        const signatureWrapper = document.createElement('div');
        signatureWrapper.className = 'collapsible-signature';
        signatureWrapper.setAttribute('data-signature-id', 'signature-0');
        
        // Move signature nodes into wrapper
        nodesToCollapse.forEach(node => {
          if (node.parentNode) {
            signatureWrapper.appendChild(node.cloneNode(true));
            node.parentNode.removeChild(node);
          }
        });
        
        tempDiv.appendChild(signatureWrapper);
      }
    }
    
    return tempDiv.innerHTML;
  }, [processedContent, isHTML]);

  const renderContent = () => {
    if (isHTML) {
      // Parse the HTML and render with React components for collapsible sections
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contentWithCollapsibleSections;
      
      const collapsibleQuotes = tempDiv.querySelectorAll('.collapsible-quote');
      const collapsibleSignatures = tempDiv.querySelectorAll('.collapsible-signature');
      
      // For now, render as-is with dangerouslySetInnerHTML
      // In a more sophisticated implementation, you'd parse and create React elements
      return (
        <div 
          className="email-render__html-content"
          dangerouslySetInnerHTML={{ __html: contentWithCollapsibleSections }}
        />
      );
    } else {
      // Plain text with enhanced formatting
      const lines = processedContent.split('\n');
      const elements: React.ReactNode[] = [];
      let currentQuoteLines: string[] = [];
      let inQuote = false;
      
      lines.forEach((line, index) => {
        const isQuoteLine = line.trimStart().startsWith('>');
        
        if (isQuoteLine && !inQuote) {
          // Start of quote section
          inQuote = true;
          currentQuoteLines = [line];
        } else if (isQuoteLine && inQuote) {
          // Continue quote section
          currentQuoteLines.push(line);
        } else if (!isQuoteLine && inQuote) {
          // End of quote section
          inQuote = false;
          elements.push(
            <CollapsibleSection
              key={`quote-${elements.length}`}
              buttonText="Show quoted text"
              id={`quote-${elements.length}`}
            >
              <pre className="email-render__quoted-text">
                {currentQuoteLines.join('\n')}
              </pre>
            </CollapsibleSection>
          );
          currentQuoteLines = [];
          
          // Add current line if it's not empty
          if (line.trim()) {
            elements.push(<pre key={index} className="email-render__text-line">{line}</pre>);
          }
        } else {
          // Regular line
          elements.push(<pre key={index} className="email-render__text-line">{line}</pre>);
        }
      });
      
      // Handle any remaining quote at the end
      if (inQuote && currentQuoteLines.length > 0) {
        elements.push(
          <CollapsibleSection
            key={`quote-${elements.length}`}
            buttonText="Show quoted text"
            id={`quote-${elements.length}`}
          >
            <pre className="email-render__quoted-text">
              {currentQuoteLines.join('\n')}
            </pre>
          </CollapsibleSection>
        );
      }
      
      return <div className="email-render__plain-content">{elements}</div>;
    }
  };

  return (
    <article 
      className={`email-render ${isHTML ? 'email-render--html' : 'email-render--text'} ${className}`}
      aria-label="Email content"
    >
      {renderContent()}
      
      {attachments && attachments.length > 0 && (
        <div className="email-render__attachments">
          <h4 className="email-render__attachments-title">Attachments</h4>
          <ul className="email-render__attachments-list">
            {attachments.map((attachment, index) => (
              <li key={index} className="email-render__attachment-item">
                <span className="email-render__attachment-name">{attachment.filename}</span>
                <span className="email-render__attachment-size">
                  {(attachment.size / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};