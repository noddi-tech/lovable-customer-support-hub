import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * URLSanitizer - Fixes malformed URLs within React Router
 * 
 * Handles URLs where query params are incorrectly encoded in the pathname
 * (e.g., /%3Finbox=... which should be /?inbox=...)
 * 
 * Uses React Router's navigate() to fix URLs without causing page reloads,
 * providing smooth SPA navigation.
 */
export const URLSanitizer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

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
          
          // Use navigate with replace to fix URL without page reload
          navigate(correctedUrl, { replace: true });
        }
      } catch (e) {
        console.error('[URLSanitizer] URL decode failed:', e);
      }
    }
  }, [location.pathname, location.hash, navigate]);

  return <>{children}</>;
};
