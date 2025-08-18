import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Development bypass: if dev_auto_login_email is set, allow access without auth
  const devBypass = typeof window !== 'undefined' && !!localStorage.getItem('dev_auto_login_email');

  useEffect(() => {
    if (devBypass) return;
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate, devBypass]);

  if (devBypass) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
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