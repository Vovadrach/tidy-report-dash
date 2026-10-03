import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isDemo } from '@/data/mode';
import { Button } from '@/components/ui/button';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, error } = useAuth();

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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="surface-card rounded-3xl p-8 shadow-md text-center max-w-sm" role="alert">
          <h1 className="display text-xl text-foreground mb-3">Не вдалося завантажити застосунок</h1>
          <p className="text-muted-foreground mb-5">{error}</p>
          <Button onClick={() => window.location.reload()}>Спробувати знову</Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
