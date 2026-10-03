/** Denied/quota-limited storage falls back to memory for the current app session. */
const memory = new Map<string, string>();
const storageKeys = () => {
  const keys = new Set(memory.keys());
  try { for (let index = 0; index < localStorage.length; index++) { const key = localStorage.key(index); if (key) keys.add(key); } } catch { /* Storage is disabled. */ }
  return [...keys];
};
export const safeStorage: Storage = {
  get length() { return storageKeys().length; },
  key(index) { return storageKeys()[index] ?? null; },
  getItem(key) { try { return localStorage.getItem(key) ?? memory.get(key) ?? null; } catch { return memory.get(key) ?? null; } },
  setItem(key, value) { try { localStorage.setItem(key, value); memory.delete(key); } catch { memory.set(key, value); } },
  removeItem(key) { memory.delete(key); try { localStorage.removeItem(key); } catch { /* Storage can be disabled. */ } },
  clear() { memory.clear(); try { localStorage.clear(); } catch { /* Storage can be disabled. */ } },
};
export const readStringArray = (key: string): string[] => {
  try {
    const value: unknown = JSON.parse(safeStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
};
export const accountCacheKey = (owner: string) => `aria-query-cache:${owner}`;
export const clearAccountStorage = (owner: string) => {
  safeStorage.removeItem(accountCacheKey(owner));
  safeStorage.removeItem(`aria-worker:${owner}`);
  safeStorage.removeItem(`aria-recent-workers:${owner}`);
  for (const key of storageKeys()) if (key.startsWith(`aria-draft:${owner}:`)) safeStorage.removeItem(key);
};
