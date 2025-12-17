/**
 * Enhanced image asset handler for email signatures and inline images
 * Handles CID, Content-Location, and data URI images with proper fallback and telemetry
 */

import type { EmailAttachment } from './emailFormatting';

interface ImageErrorBucket {
  'cid-miss': number;
  'cl-miss': number;
  'mixed-content': number;
  'csp-block': number;
  'auth-required': number;
  'data-rejected': number;
}

// Global error tracking for telemetry
const imageErrors: ImageErrorBucket = {
  'cid-miss': 0,
  'cl-miss': 0,
  'mixed-content': 0,
  'csp-block': 0,
  'auth-required': 0,
  'data-rejected': 0
};

// Track object URLs for cleanup
const createdObjectUrls = new Set<string>();

/**
 * Create a placeholder image for failed image loads
 */
export const createPlaceholder = (reason: keyof ImageErrorBucket): string => {
  const messages = {
    'cid-miss': 'CID not found',
    'cl-miss': 'Location not found',
    'mixed-content': 'Mixed content blocked',
    'csp-block': 'CSP blocked',
    'auth-required': 'Authentication required',
    'data-rejected': 'Data image rejected'
  };
  
  const message = messages[reason] || 'Image unavailable';
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
      <rect width="200" height="100" fill="#f3f4f6" stroke="#e5e7eb" stroke-width="1"/>
      <text x="100" y="45" text-anchor="middle" fill="#9ca3af" font-size="11" font-family="system-ui">
        ${message}
      </text>
      <text x="100" y="65" text-anchor="middle" fill="#d1d5db" font-size="9" font-family="system-ui">
        ${reason}
      </text>
    </svg>
  `)}`;
};

/**
 * Log image error for telemetry
 */
export const logImageError = (reason: keyof ImageErrorBucket, src: string) => {
  imageErrors[reason]++;
  console.warn(`[EmailRender] Image error (${reason}):`, src, 'Total:', imageErrors[reason]);
};

/**
 * Get error statistics for debugging
 */
export const getImageErrorStats = (): ImageErrorBucket => {
  return { ...imageErrors };
};

/**
 * Create blob URL from attachment data and track for cleanup
 */
export const createBlobUrl = async (attachment: EmailAttachment, messageId?: string): Promise<string | null> => {
  try {
    let fetchUrl: string;
    
    // Use storageKey for Supabase Storage attachments (new method)
    if (attachment.storageKey) {
      fetchUrl = `${window.location.origin}/supabase/functions/v1/get-attachment?key=${encodeURIComponent(attachment.storageKey)}`;
      console.log('[EmailRender] Fetching from storage:', attachment.storageKey);
    } 
    // Fall back to contentId lookup
    else if (attachment.contentId) {
      const cleanCid = attachment.contentId.replace(/[<>]/g, '');
      fetchUrl = `${window.location.origin}/supabase/functions/v1/get-attachment/${cleanCid}?messageId=${messageId || ''}`;
      console.log('[EmailRender] Fetching by contentId:', cleanCid);
    }
    // Legacy: use attachmentId
    else if (attachment.attachmentId) {
      fetchUrl = `${window.location.origin}/supabase/functions/v1/get-attachment/${attachment.attachmentId}?messageId=${messageId || ''}`;
      console.log('[EmailRender] Fetching by attachmentId:', attachment.attachmentId);
    }
    else {
      console.warn('[EmailRender] No storageKey, contentId, or attachmentId for attachment:', attachment.filename);
      return null;
    }
    
    const response = await fetch(fetchUrl);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        logImageError('auth-required', attachment.filename);
      }
      console.warn('[EmailRender] Failed to fetch attachment:', response.status, attachment.filename);
      return null;
    }
    
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    createdObjectUrls.add(blobUrl);
    
    console.log('[EmailRender] Created blob URL for:', attachment.filename);
    return blobUrl;
  } catch (error) {
    console.error('[EmailRender] Failed to create blob URL:', error);
    return null;
  }
};

/**
 * Clean up all created object URLs
 */
export const cleanupObjectUrls = () => {
  createdObjectUrls.forEach(url => {
    URL.revokeObjectURL(url);
  });
  createdObjectUrls.clear();
};

/**
 * Check if URL is relative
 */
export const isRelativeUrl = (url: string): boolean => {
  return !url.match(/^(?:[a-z]+:)?\/\//i) && !url.startsWith('data:') && !url.startsWith('blob:');
};

/**
 * Rewrite image sources in HTML container
 */
export const rewriteImageSources = async (
  container: HTMLElement,
  byContentId: Map<string, { attachment: EmailAttachment }>,
  byContentLocation: Map<string, { attachment: EmailAttachment }>,
  messageId?: string,
  baseUrl?: string
): Promise<void> => {
  const images = container.querySelectorAll('img');
  
  for (const img of images) {
    const originalSrc = img.getAttribute('src') || '';
    
    // Handle CID references
    if (/^cid:/i.test(originalSrc)) {
      const key = originalSrc.replace(/^cid:/i, '').replace(/[<>]/g, '').toLowerCase();
      const assetInfo = byContentId.get(key);
      
      if (assetInfo) {
        const blobUrl = await createBlobUrl(assetInfo.attachment, messageId);
        if (blobUrl) {
          img.src = blobUrl;
        } else {
          img.src = createPlaceholder('auth-required');
          logImageError('auth-required', originalSrc);
        }
      } else {
        img.src = createPlaceholder('cid-miss');
        logImageError('cid-miss', originalSrc);
      }
    }
    // Handle relative URLs and Content-Location references
    else if (isRelativeUrl(originalSrc)) {
      const normalizedSrc = originalSrc.split('/').pop()?.toLowerCase() || originalSrc.toLowerCase();
      const assetInfo = byContentLocation.get(normalizedSrc);
      
      if (assetInfo) {
        const blobUrl = await createBlobUrl(assetInfo.attachment, messageId);
        if (blobUrl) {
          img.src = blobUrl;
        } else {
          img.src = createPlaceholder('auth-required');
          logImageError('auth-required', originalSrc);
        }
      } else if (baseUrl) {
        try {
          img.src = new URL(originalSrc, baseUrl).toString();
        } catch {
          img.src = createPlaceholder('cl-miss');
          logImageError('cl-miss', originalSrc);
        }
      } else {
        img.src = createPlaceholder('cl-miss');
        logImageError('cl-miss', originalSrc);
      }
    }
    // Handle data URIs with validation
    else if (/^data:/i.test(originalSrc)) {
      if (!/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(originalSrc)) {
        img.src = createPlaceholder('data-rejected');
        logImageError('data-rejected', originalSrc);
      }
      // Valid data URI, keep as-is
    }
    
    // Add error handler for runtime errors
    img.onerror = () => {
      const currentSrc = img.getAttribute('src') || '';
      let errorReason: keyof ImageErrorBucket = 'mixed-content';
      
      if (currentSrc.includes('cid-miss')) errorReason = 'cid-miss';
      else if (currentSrc.includes('cl-miss')) errorReason = 'cl-miss';
      else if (currentSrc.includes('auth-required')) errorReason = 'auth-required';
      else if (currentSrc.includes('data-rejected')) errorReason = 'data-rejected';
      else if (currentSrc.startsWith('https:') && window.location.protocol === 'https:') errorReason = 'csp-block';
      
      img.src = createPlaceholder(errorReason);
      logImageError(errorReason, originalSrc);
    };
  }
};
