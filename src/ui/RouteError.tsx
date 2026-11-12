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
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-canvas p-6 text-center">
    <p role="alert" className="max-w-xs text-callout text-ink-2">Не вдалося відкрити сторінку. Перевірте підключення і спробуйте ще раз.</p>
    <button onClick={retry} className="press h-12 rounded-[16px] bg-accent px-6 font-semibold text-accent-on">Оновити сторінку</button>
  </div>;
};
