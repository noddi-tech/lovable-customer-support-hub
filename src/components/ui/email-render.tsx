import React, { useState, useCallback, useMemo, Suspense, lazy, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Download, Eye, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { sanitizeEmailHTML, formatPlainTextEmail, type EmailAttachment, fixEncodingIssues } from '@/utils/emailFormatting';
import { cleanupObjectUrls, rewriteImageSources, getImageErrorStats, logImageError } from '@/utils/imageAssetHandler';
import { sanitizeEmailHTML as sanitizeForXSS } from '@/utils/htmlSanitizer';
import { decodeHTMLEntities } from '@/lib/parseQuotedEmail';
import { debug } from '@/utils/debug';
import { logger } from '@/utils/logger';

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
  
  // Track renders
  const renderCount = useRef(0);
  const prevAttachmentsRef = useRef(attachments);
  
  useEffect(() => {
    renderCount.current++;
    const attachmentsChanged = prevAttachmentsRef.current !== attachments;
    
    logger.debug(`EmailRender render #${renderCount.current}`, {
      messageId: messageId?.slice(-8),
      contentLength: content.length,
      attachmentsCount: attachments.length,
      attachmentsChanged,
      attachmentsReference: attachments.length > 0 ? 'array ref' : 'empty'
    }, 'EmailRender');
    
    prevAttachmentsRef.current = attachments;
  });
  const isHTML = useMemo(() => {
    // Check content type first
    if (contentType.toLowerCase().includes('html')) return true;
    
    // Only treat as HTML if it has COMPLETE HTML tags (not just < or >)
    const htmlTagPattern = /<\/?[a-z][\s\S]*>/i;
    const hasHTMLTags = htmlTagPattern.test(content);
    
    // If only wrapped in a single <p> tag, treat as plain text
    if (hasHTMLTags) {
      const singlePWrapper = /^<p>(.*)<\/p>$/s;
      if (singlePWrapper.test(content.trim())) {
        return false; // Treat as plain text
      }
    }
    
    return hasHTMLTags;
  }, [content, contentType]);

  const processedContent = useMemo(() => {
    logger.time('processedContent', 'EmailRender');
    logger.debug('Processing email content - MEMO RUNNING', { 
      messageId: messageId?.slice(-8), 
      contentType, 
      isHTML, 
      attachmentsCount: attachments.length,
      attachmentsRef: attachments.length > 0 ? 'has attachments' : 'no attachments'
    }, 'EmailRender');
    
    let normalized = fixEncodingIssues(content);
    
    // CRITICAL: Decode HTML entities for BOTH HTML and plain text content
    // This handles Gmail/Outlook sending &lt;br/&gt; in plain text emails
    logger.debug('Content entity decoding', { 
      before: normalized.substring(0, 100),
      messageId: messageId?.slice(-8)
    }, 'EmailRender');
    normalized = decodeHTMLEntities(normalized);
    logger.debug('Content decoded', { 
      after: normalized.substring(0, 100),
      messageId: messageId?.slice(-8)
    }, 'EmailRender');
    
    let result;
    if (isHTML) {
      const alreadyWrapped = /class=\"email-render\"/.test(normalized);
      result = alreadyWrapped ? normalized : sanitizeEmailHTML(normalized, attachments, true, messageId);
    } else {
      // For plain text, format the decoded content (converts <br/> to newlines)
      result = formatPlainTextEmail(normalized);
    }
    
    logger.timeEnd('processedContent', 'EmailRender');
    return result;
  }, [content, isHTML, attachments, messageId, contentType]);

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
    logger.debug('Rendering email', {
      processedLength: processedContent.length,
      originalLength: content.length,
      isHTML,
      messageId
    }, 'EmailRender');

    // If processed content is empty or too short, fall back to original
    const contentToRender = processedContent.trim().length > 10 
      ? processedContent 
      : content;
    
    if (isHTML) {
      // Parse the HTML and render with React components for collapsible sections
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contentWithCollapsibleSections || contentToRender;
      
      const collapsibleQuotes = tempDiv.querySelectorAll('.collapsible-quote');
      const collapsibleSignatures = tempDiv.querySelectorAll('.collapsible-signature');
      
      // SECURITY: Sanitize HTML content before rendering to prevent XSS attacks
      const sanitizedContent = sanitizeForXSS(contentWithCollapsibleSections || contentToRender);
      
      logger.debug('Content sanitized', {
        sanitizedLength: sanitizedContent.length,
        messageId
      }, 'EmailRender');
      
      // Additional check: if sanitized content has no actual text, show original as plain text
      const tempDiv2 = document.createElement('div');
      tempDiv2.innerHTML = sanitizedContent;
      const visibleText = tempDiv2.textContent || tempDiv2.innerText || '';
      
      if (!sanitizedContent || visibleText.trim().length < 10) {
        console.warn('[EmailRender] HTML parsing resulted in empty content, falling back to plain text', {
          sanitizedLength: sanitizedContent.length,
          visibleTextLength: visibleText.trim().length
        });
        return (
          <div className="email-render__plain-content">
            <pre className="email-render__text-line" style={{
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              margin: 0,
              padding: 0,
              lineHeight: '1.6'
            }}>{content}</pre>
          </div>
        );
      }
      
      // Debug logging
      debug.group('[EmailRender] HTML Content', {
        messageId: messageId?.slice(-8),
        contentType,
        hasQuotedBlocks: tempDiv.querySelectorAll('.collapsible-quote').length > 0,
      }, true);
      debug.groupEnd();
      
      return (
        <div 
          className="email-render__html-content prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_p.mt-extra]:mt-4 [&_ul]:my-0.5 [&_ol]:my-0.5 [&_div]:my-0 [&_h1]:my-1 [&_h2]:my-1 [&_h3]:my-1 [&_blockquote]:my-1 [&_.email-signature]:text-xs [&_.email-signature]:text-muted-foreground [&_.email-signature]:mt-4 [&_.email-signature]:pt-3 [&_.email-signature]:border-t"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      );
    } else {
      // Plain text - format as structured HTML for consistency
      // contentToRender is already formatted HTML from processedContent memo
      const formattedHtml = contentToRender;
      
      // Debug logging
      debug.group('[EmailRender] Plain Text', {
        messageId: messageId?.slice(-8),
        contentType,
      }, true);
      debug.groupEnd();
      
      return (
        <div 
          className="email-render__plain-content prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_p.mt-extra]:mt-4 [&_ul]:my-0.5 [&_ol]:my-0.5 [&_div]:my-0 [&_.email-signature]:text-xs [&_.email-signature]:text-muted-foreground [&_.email-signature]:mt-4 [&_.email-signature]:pt-3 [&_.email-signature]:border-t"
          dangerouslySetInnerHTML={{ __html: formattedHtml }}
        />
      );
    }
  };

  const hasBlockedImages = useMemo(() => {
    return isHTML && content.includes('Image blocked for privacy');
  }, [isHTML, content]);

  // Enhanced image processing effect
  useEffect(() => {
    logger.debug('Image processing triggered', {
      isHTML,
      attachmentsLength: attachments.length,
      messageId,
      inlineCount: attachments.filter(a => a.isInline).length
    }, 'EmailRender');

    if (!isHTML || !attachments.length) {
      logger.debug('Skipping image processing - not HTML or no attachments', { messageId }, 'EmailRender');
      setImageProcessingComplete(true);
      return;
    }

    const processImages = async () => {
      try {
        const container = document.querySelector('.email-render__html-content') as HTMLElement;
        if (!container) {
          logger.debug('No container found for image processing', { messageId }, 'EmailRender');
          return;
        }

        logger.debug('Processing inline images', { messageId, attachmentsCount: attachments.length }, 'EmailRender');

        // Build asset indexes
        const byContentId = new Map();
        const byContentLocation = new Map();
        
        attachments.forEach((attachment, index) => {
          logger.debug('Processing attachment', { 
            index, 
            filename: attachment.filename,
            hasContentId: !!attachment.contentId,
            hasContentLocation: !!attachment.contentLocation,
            messageId 
          }, 'EmailRender');
          
          if (attachment.contentId) {
            const normalizedCid = attachment.contentId.replace(/^cid:/i, '').replace(/[<>]/g, '').toLowerCase();
            logger.debug('Mapped content ID', { normalizedCid, messageId }, 'EmailRender');
            byContentId.set(normalizedCid, { attachment });
          }
          
          if (attachment.contentLocation) {
            const normalizedLocation = attachment.contentLocation.includes('/') 
              ? attachment.contentLocation.split('/').pop()?.toLowerCase() 
              : attachment.contentLocation.toLowerCase();
            if (normalizedLocation) {
              logger.debug('Mapped content location', { normalizedLocation, messageId }, 'EmailRender');
              byContentLocation.set(normalizedLocation, { attachment });
            }
          }
        });

        logger.debug('Asset indexes built', {
          contentIdCount: byContentId.size,
          contentLocationCount: byContentLocation.size,
          messageId
        }, 'EmailRender');

        // Process images with enhanced error handling
        await rewriteImageSources(container, byContentId, byContentLocation, messageId);
        setImageProcessingComplete(true);
        
        // Log processing stats for debugging
        const errorStats = getImageErrorStats();
        logger.debug('Image processing complete', { errorStats, messageId }, 'EmailRender');
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
      style={{
        lineHeight: '1.5',
        padding: '0',
      }}
    >
      {/* Email Controls */}
      {showLoadImagesControl && hasBlockedImages && !imagesLoaded && (
        <div className="email-render__controls mb-3" role="toolbar" aria-label="Email actions">
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
        </div>
      )}

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