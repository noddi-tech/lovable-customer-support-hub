import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Detect and fix malformed URLs with encoded query params (%3F = ?)
    if (location.pathname.includes('%3F') || location.pathname.includes('%3f')) {
      const correctedPath = decodeURIComponent(location.pathname);
      const queryIndex = correctedPath.indexOf('?');
      if (queryIndex !== -1) {
        const newPath = correctedPath.substring(0, queryIndex) || '/';
        const queryString = correctedPath.substring(queryIndex);
        navigate(newPath + queryString, { replace: true });
        return;
      }
    }

    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname, navigate]);

  // Don't render 404 page if we're redirecting
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
