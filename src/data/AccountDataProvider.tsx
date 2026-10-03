import { useEffect, useMemo, type ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useAuth } from '@/contexts/AuthContext';
import { accountCacheKey, safeStorage } from '@/lib/storage';
import { isDemo } from './mode';

const createAccountClient = () => new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'always', retry: (count) => navigator.onLine && count < 1, staleTime: 60_000, gcTime: 7 * 24 * 60 * 60 * 1000 },
    // Never persist or replay financial writes after an account change.
    mutations: { retry: false, networkMode: 'always' },
  },
});
const AccountCache = ({ owner, children }: { owner: string; children: ReactNode }) => {
  const client = useMemo(createAccountClient, []);
  const persister = useMemo(() => createSyncStoragePersister({
    storage: safeStorage, key: accountCacheKey(owner),
  }), [owner]);
  useEffect(() => {
    // The old shared cache can contain another account's records.
    safeStorage.removeItem('aria-query-cache');
    if (typeof caches !== 'undefined') void caches.delete('supabase-cache').catch(() => {});
    return () => { void client.cancelQueries(); client.clear(); };
  }, [client]);
  return <PersistQueryClientProvider client={client} persistOptions={{
    persister, buster: `${__APP_VERSION__}:account-cents-1`, maxAge: 7 * 24 * 60 * 60 * 1000,
    dehydrateOptions: { shouldDehydrateMutation: () => false },
  }}>{children}</PersistQueryClientProvider>;
};
export const AccountDataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const owner = isDemo ? 'demo' : user?.id ?? 'guest';
  return <AccountCache key={owner} owner={owner}>{children}</AccountCache>;
};
