import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Comment out auth check for development
  // useEffect(() => {
  //   console.log('ProtectedRoute - user:', user, 'loading:', loading);
  //   if (!loading && !user) {
  //     console.log('ProtectedRoute - redirecting to auth');
  //     navigate('/auth', { replace: true });
  //   }
  // }, [user, loading, navigate]);

  // Skip loading and auth checks for development
  // if (loading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
  //         <p className="text-muted-foreground">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // if (!user) {
  //   return null;
  // }

  // Always render children for development
  return <>{children}</>;
};