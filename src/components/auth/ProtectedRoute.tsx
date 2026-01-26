import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, isProcessingOAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logger.debug('ProtectedRoute state', { 
      loading, 
      isProcessingOAuth, 
      hasUser: !!user,
      pathname: window.location.pathname 
    }, 'ProtectedRoute');

    // Only proceed when BOTH loading and OAuth processing are complete
    if (!loading && !isProcessingOAuth) {
      if (!user) {
        // Give one final moment for state propagation
        const timer = setTimeout(() => {
          // Re-check user in case it was set during the timeout
          if (!user) {
            logger.warn('No user after auth complete, redirecting to login', undefined, 'ProtectedRoute');
            navigate('/auth', { replace: true });
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [user, loading, isProcessingOAuth, navigate]);

  // Show loading while authenticating OR processing OAuth
  if (loading || isProcessingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isProcessingOAuth ? 'Completing sign in...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
