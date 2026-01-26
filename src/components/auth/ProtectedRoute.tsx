import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const hasAttemptedAuth = useRef(false);

  useEffect(() => {
    // Once loading is complete, we know the auth state
    if (!loading) {
      hasAttemptedAuth.current = true;
      
      if (!user) {
        // Small delay to handle OAuth callback timing
        const timer = setTimeout(() => {
          if (!user) {
            navigate('/auth', { replace: true });
          }
        }, 500);
        return () => clearTimeout(timer);
      } else {
        setIsReady(true);
      }
    }
  }, [user, loading, navigate]);

  // Also check: if user arrives with a hash fragment (OAuth callback), wait longer
  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      // OAuth callback detected - give extra time for token exchange
      const timer = setTimeout(() => setIsReady(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (loading || (!isReady && !hasAttemptedAuth.current)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
