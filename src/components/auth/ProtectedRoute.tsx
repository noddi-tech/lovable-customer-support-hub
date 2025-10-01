import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [gracePeriodActive, setGracePeriodActive] = useState(true);

  useEffect(() => {
    // Add 2-second grace period before redirecting
    if (!loading && !user) {
      const timer = setTimeout(() => {
        setGracePeriodActive(false);
        navigate('/auth', { replace: true });
      }, 2000);

      return () => clearTimeout(timer);
    } else if (user) {
      setGracePeriodActive(false);
    }
  }, [user, loading, navigate]);

  if (loading || gracePeriodActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {loading ? 'Loading...' : 'Verifying session...'}
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