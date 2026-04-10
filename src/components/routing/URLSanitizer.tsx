import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/**
 * URLSanitizer - Fixes malformed URLs within React Router
 * 
 * 1. Handles URLs where query params are incorrectly encoded in the pathname
 *    (e.g., /%3Finbox=... which should be /?inbox=...)
 * 
 * 2. Migrates legacy ?c= conversation query params to path-based resource URLs
 *    (e.g., /interactions/text/open?c=abc123 → /interactions/text/conversations/abc123)
 */
export const URLSanitizer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const pathname = location.pathname;
    
    // Check if pathname contains encoded query string (%3F = ?)
    if (pathname.includes('%3F') || pathname.includes('%3f')) {
      try {
        const decoded = decodeURIComponent(pathname);
        const queryStart = decoded.indexOf('?');
        
        if (queryStart !== -1) {
          const basePath = decoded.substring(0, queryStart) || '/';
          const queryString = decoded.substring(queryStart);
          const correctedUrl = basePath + queryString + location.hash;
          
          console.log('[URLSanitizer] Fixing malformed URL:', pathname, '→', correctedUrl);
          navigate(correctedUrl, { replace: true });
          return;
        }
      } catch (e) {
        console.error('[URLSanitizer] URL decode failed:', e);
      }
    }
  }, [location.pathname, location.hash, navigate]);

  // Migrate legacy ?c= query param to path-based resource URL
  useEffect(() => {
    const conversationId = searchParams.get('c') || searchParams.get('conversation');
    if (!conversationId) return;
    
    // Determine interaction type from current path
    const isChat = location.pathname.includes('/interactions/chat');
    const type = isChat ? 'chat' : 'text';
    
    // Build new URL preserving other params
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('c');
    newParams.delete('conversation');
    const qs = newParams.toString();
    
    const newPath = `/interactions/${type}/conversations/${conversationId}${qs ? `?${qs}` : ''}`;
    console.log('[URLSanitizer] Migrating legacy ?c= URL:', location.pathname + location.search, '→', newPath);
    navigate(newPath, { replace: true });
  }, [searchParams, location.pathname, location.search, navigate]);

  return <>{children}</>;
};
