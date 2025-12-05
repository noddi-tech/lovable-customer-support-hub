import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Malformed URLs are now handled in main.tsx before React loads
    // This should only fire for genuine 404 errors
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

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
