import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isDemo } from '@/data';
import { ScreenSkeleton } from '@/ui/Skeleton';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // Demo-режим (VITE_DEMO=1): скриншоти/smoke без Supabase-авторизації
  if (isDemo) return <>{children}</>;

  if (loading) return <ScreenSkeleton />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
