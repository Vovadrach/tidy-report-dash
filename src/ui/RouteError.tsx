import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { accountCacheKey, safeStorage } from '@/lib/storage';
import { isDemo } from '@/data/mode';

export const RouteError = () => {
  const { user } = useAuth();
  const client = useQueryClient();
  const retry = () => {
    client.clear();
    safeStorage.removeItem(accountCacheKey(isDemo ? 'demo' : user?.id ?? 'guest'));
    window.location.reload();
  };
  return <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
    <p role="alert">Не вдалося відкрити сторінку. Перевірте підключення і спробуйте ще раз.</p>
    <button onClick={retry} className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Оновити сторінку</button>
  </div>;
};
