import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isDemo } from '@/data/mode';
import { ScreenSkeleton } from '@/ui/Skeleton';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, error } = useAuth();

  // Demo-режим (VITE_DEMO=1): скриншоти/smoke без Supabase-авторизації
  if (isDemo) return <>{children}</>;

  if (loading) return <ScreenSkeleton />;

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
        <div className="card max-w-sm p-8 text-center" role="alert">
          <h1 className="mb-2 text-[1.25rem] font-bold text-ink">Не вдалося завантажити застосунок</h1>
          <p className="mb-6 text-callout text-ink-3">{error}</p>
          <button onClick={() => window.location.reload()} className="press h-12 rounded-[16px] bg-accent px-6 font-semibold text-accent-on">Спробувати знову</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
