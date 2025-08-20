import React, { useState, useCallback, useMemo, Suspense, lazy, useEffect } from 'react';
import { ChevronDown, ChevronUp, Download, Eye, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { sanitizeEmailHTML, formatPlainTextEmail, type EmailAttachment } from '@/utils/emailFormatting';
import { cleanupObjectUrls, rewriteImageSources, getImageErrorStats, logImageError } from '@/utils/imageAssetHandler';

interface EmailRenderProps {
  content: string;
  contentType?: string;
  attachments?: EmailAttachment[];
  messageId?: string;
  className?: string;
  showLoadImagesControl?: boolean;
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

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggleCollapse();
    }
  }, [toggleCollapse]);

  return (
    <div className="email-render__collapsible">
      <Button
        variant="ghost"
        size="sm"
        className="email-render__collapsible-toggle focus:ring-2 focus:ring-primary focus:outline-none"
        onClick={toggleCollapse}
        onKeyDown={handleKeyDown}
        aria-expanded={!isCollapsed}
        aria-controls={id}
        aria-label={`${isCollapsed ? 'Show' : 'Hide'} ${buttonText.toLowerCase()}`}
        tabIndex={0}
      >
        <span className="text-muted-foreground text-xs">{buttonText}</span>
        {isCollapsed ? (
          <ChevronDown className="h-3 w-3 ml-1" aria-hidden="true" />
        ) : (
          <ChevronUp className="h-3 w-3 ml-1" aria-hidden="true" />
        )}
      </Button>
      {!isCollapsed && (
        <div 
          id={id} 
          className="email-render__collapsible-content"
          role="region"
          aria-labelledby={`${id}-toggle`}
        >
          <Suspense fallback={<div className="text-muted-foreground text-xs">Loading...</div>}>
            {children}
          </Suspense>
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
  className = '',
  showLoadImagesControl = true
}) => {
  const { toast } = useToast();
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [imageProcessingComplete, setImageProcessingComplete] = useState(false);
  const isHTML = useMemo(() => 
    contentType.toLowerCase().includes('html') || /<[^>]+>/.test(content),
    [content, contentType]
  );

  const processedContent = useMemo(() => {
    console.log('[EmailRender] Processing content for message:', messageId);
    console.log('[EmailRender] Content type:', contentType, 'isHTML:', isHTML);
    console.log('[EmailRender] Attachments available:', attachments);
    
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

  const loadImages = useCallback(() => {
    const emailContainer = document.querySelector('.email-render__html-content');
    if (emailContainer) {
      const blockedImages = emailContainer.querySelectorAll('img[data-blocked="true"]');
      blockedImages.forEach((img) => {
        const originalSrc = img.getAttribute('data-original-src');
        if (originalSrc) {
          img.setAttribute('src', originalSrc);
          img.removeAttribute('data-blocked');
          img.removeAttribute('data-original-src');
        }
      });
      setImagesLoaded(true);
      toast({
        title: "Images loaded",
        description: "External images are now visible",
      });
    }
  }, [toast]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedToClipboard(true);
      toast({
        title: "Copied to clipboard",
        description: "Email content has been copied",
      });
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy email content to clipboard",
        variant: "destructive",
      });
    }
  }, [content, toast]);

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

  const hasBlockedImages = useMemo(() => {
    return isHTML && content.includes('Image blocked for privacy');
  }, [isHTML, content]);

  // Enhanced image processing effect
  useEffect(() => {
    console.log('[EmailRender] Image processing effect triggered:', {
      isHTML,
      attachmentsLength: attachments.length,
      messageId,
      attachments: attachments.map(a => ({ 
        filename: a.filename, 
        contentId: a.contentId, 
        contentLocation: a.contentLocation,
        isInline: a.isInline 
      }))
    });

    if (!isHTML || !attachments.length) {
      console.log('[EmailRender] Skipping image processing - not HTML or no attachments');
      setImageProcessingComplete(true);
      return;
    }

    const processImages = async () => {
      try {
        const container = document.querySelector('.email-render__html-content') as HTMLElement;
        if (!container) {
          console.log('[EmailRender] No container found for image processing');
          return;
        }

        console.log('[EmailRender] Found container, processing images...');

        // Build asset indexes
        const byContentId = new Map();
        const byContentLocation = new Map();
        
        attachments.forEach((attachment, index) => {
          console.log(`[EmailRender] Processing attachment ${index}:`, attachment);
          
          if (attachment.contentId) {
            const normalizedCid = attachment.contentId.replace(/^cid:/i, '').replace(/[<>]/g, '').toLowerCase();
            console.log(`[EmailRender] Adding to byContentId: "${normalizedCid}"`);
            byContentId.set(normalizedCid, { attachment });
          }
          
          if (attachment.contentLocation) {
            const normalizedLocation = attachment.contentLocation.includes('/') 
              ? attachment.contentLocation.split('/').pop()?.toLowerCase() 
              : attachment.contentLocation.toLowerCase();
            if (normalizedLocation) {
              console.log(`[EmailRender] Adding to byContentLocation: "${normalizedLocation}"`);
              byContentLocation.set(normalizedLocation, { attachment });
            }
          }
        });

        console.log('[EmailRender] Asset indexes built:', {
          byContentId: Array.from(byContentId.entries()),
          byContentLocation: Array.from(byContentLocation.entries())
        });

        // Process images with enhanced error handling
        await rewriteImageSources(container, byContentId, byContentLocation, messageId);
        setImageProcessingComplete(true);
        
        // Log processing stats for debugging
        const errorStats = getImageErrorStats();
        console.log('[EmailRender] Image processing complete. Stats:', errorStats);
      } catch (error) {
        console.error('[EmailRender] Image processing failed:', error);
        setImageProcessingComplete(true);
      }
    };

    const timer = setTimeout(processImages, 100); // Small delay to ensure DOM is ready
    return () => clearTimeout(timer);
  }, [isHTML, attachments, messageId]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      cleanupObjectUrls();
    };
  }, []);

  return (
    <article 
      className={`email-render ${isHTML ? 'email-render--html' : 'email-render--text'} ${className}`}
      aria-label="Email message content"
      role="article"
    >
      {/* Email Controls */}
      <div className="email-render__controls" role="toolbar" aria-label="Email actions">
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="text-xs"
          aria-label="Copy email content to clipboard"
        >
          {copiedToClipboard ? (
            <Check className="h-3 w-3 mr-1" aria-hidden="true" />
          ) : (
            <Copy className="h-3 w-3 mr-1" aria-hidden="true" />
          )}
          {copiedToClipboard ? 'Copied' : 'Copy'}
        </Button>
        
        {showLoadImagesControl && hasBlockedImages && !imagesLoaded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={loadImages}
            className="text-xs"
            aria-label="Load blocked images"
          >
            <ImageIcon className="h-3 w-3 mr-1" aria-hidden="true" />
            Load images
          </Button>
        )}
      </div>

      {/* Email Content */}
      <div className="email-render__content" role="main">
        {renderContent()}
      </div>
      
      {/* Attachments */}
      {attachments && attachments.length > 0 && (
        <div className="email-render__attachments" role="region" aria-label="Email attachments">
          <h4 className="email-render__attachments-title" id="attachments-heading">
            Attachments ({attachments.length})
          </h4>
          <ul 
            className="email-render__attachments-list" 
            role="list"
            aria-labelledby="attachments-heading"
          >
            {attachments.map((attachment, index) => (
              <li key={index} className="email-render__attachment-item" role="listitem">
                <div className="email-render__attachment-info">
                  <span className="email-render__attachment-name" title={attachment.filename}>
                    {attachment.filename}
                  </span>
                  <span className="email-render__attachment-size" aria-label={`File size: ${(attachment.size / 1024).toFixed(1)} kilobytes`}>
                    {(attachment.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="email-render__attachment-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    aria-label={`Download ${attachment.filename}`}
                    onClick={() => {
                      // Download functionality would be implemented here
                      const downloadUrl = `${window.location.origin}/supabase/functions/v1/get-attachment/${attachment.attachmentId}?messageId=${messageId || ''}&download=true`;
                      const link = document.createElement('a');
                      link.href = downloadUrl;
                      link.download = attachment.filename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" aria-hidden="true" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    aria-label={`Preview ${attachment.filename}`}
                    onClick={() => {
                      // Preview functionality would be implemented here
                      const previewUrl = `${window.location.origin}/supabase/functions/v1/get-attachment/${attachment.attachmentId}?messageId=${messageId || ''}`;
                      window.open(previewUrl, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" aria-hidden="true" />
                    Preview
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};