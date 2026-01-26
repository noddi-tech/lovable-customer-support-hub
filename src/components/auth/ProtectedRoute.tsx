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

  // Log every render with full state
  useEffect(() => {
    logger.debug('ProtectedRoute render', { 
      loading, 
      isProcessingOAuth, 
      hasUser: !!user,
      userId: user?.id,
      pathname: window.location.pathname,
      hash: window.location.hash ? 'present' : 'none'
    }, 'ProtectedRoute');
  });

  useEffect(() => {
    logger.debug('ProtectedRoute effect triggered', { 
      loading, 
      isProcessingOAuth, 
      hasUser: !!user,
      willCheck: !loading && !isProcessingOAuth
    }, 'ProtectedRoute');

    // Only proceed when BOTH loading and OAuth processing are complete
    if (!loading && !isProcessingOAuth) {
      if (!user) {
        logger.warn('No user after auth complete - starting redirect timer', {
          timerMs: 300,
          pathname: window.location.pathname
        }, 'ProtectedRoute');
        
        // Give one final moment for state propagation
        const timer = setTimeout(() => {
          // Log final state before redirect decision
          logger.info('Redirect timer fired', { 
            hasUser: !!user,
            willRedirect: !user,
            pathname: window.location.pathname
          }, 'ProtectedRoute');
          
          // Re-check user in case it was set during the timeout
          if (!user) {
            logger.warn('Redirecting to /auth', { 
              reason: 'No user after all loading complete',
              pathname: window.location.pathname
            }, 'ProtectedRoute');
            navigate('/auth', { replace: true });
          }
        }, 300);
        return () => {
          logger.debug('Redirect timer cancelled', undefined, 'ProtectedRoute');
          clearTimeout(timer);
        };
      } else {
        logger.debug('User authenticated - rendering children', { 
          userId: user.id,
          email: user.email
        }, 'ProtectedRoute');
      }
    }
  }, [user, loading, isProcessingOAuth, navigate]);

  // Show loading while authenticating OR processing OAuth
  if (loading || isProcessingOAuth) {
    logger.debug('Rendering loading state', { 
      loading, 
      isProcessingOAuth 
    }, 'ProtectedRoute');
    
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
    logger.debug('Rendering null - waiting for redirect', undefined, 'ProtectedRoute');
    return null;
  }

  return <>{children}</>;
};
