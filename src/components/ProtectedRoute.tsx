import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isDemo } from '@/data';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // Demo-режим (VITE_DEMO=1): скриншоти/smoke без Supabase-авторизації
  if (isDemo) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="surface-card rounded-3xl p-8 shadow-md">
          <p className="text-muted-foreground text-lg animate-pulse">Завантаження...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
