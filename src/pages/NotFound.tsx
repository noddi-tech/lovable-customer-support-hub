import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Detect malformed URLs with encoded query params (%3F = ?)
    // Only attempt redirect once to prevent infinite loops
    if (!hasRedirected.current && (location.pathname.includes('%3F') || location.pathname.includes('%3f'))) {
      hasRedirected.current = true;
      
      try {
        const decodedPath = decodeURIComponent(location.pathname);
        const queryIndex = decodedPath.indexOf('?');
        
        if (queryIndex !== -1) {
          const basePath = decodedPath.substring(0, queryIndex) || '/';
          const queryString = decodedPath.substring(queryIndex);
          console.log('[NotFound] Fixing malformed URL:', location.pathname, '→', basePath + queryString);
          navigate(basePath + queryString, { replace: true });
          return;
        }
      } catch (e) {
        console.error('[NotFound] Failed to decode URL:', e);
      }
    }

    // Only log 404 error if not a malformed URL redirect
    if (!location.pathname.includes('%3F') && !location.pathname.includes('%3f')) {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname
      );
    }
  }, [location.pathname, navigate]);

  // Don't render 404 page while redirecting malformed URLs
  if (location.pathname.includes('%3F') || location.pathname.includes('%3f')) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-surface">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Oops! Page not found</p>
        <Link 
          to="/" 
          className="inline-flex items-center px-6 py-3 bg-gradient-primary hover:bg-primary-hover text-primary-foreground rounded-lg shadow-glow transition-all duration-200 hover:shadow-lg"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
