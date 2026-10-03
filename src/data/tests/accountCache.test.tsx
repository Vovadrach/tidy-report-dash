// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDataProvider } from '../AccountDataProvider';
import { safeStorage } from '@/lib/storage';
const auth = vi.hoisted(() => ({ owner: 'A' as string | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.owner ? { id: auth.owner } : null }) }));
vi.mock('@/data/mode', () => ({ isDemo: false }));
const read = vi.fn<(owner: string | null,signal: AbortSignal) => Promise<string>>();
const displays: Array<{ owner: string | null; data: string | undefined }> = [];
const Rows = () => {
  const owner = auth.owner;
  const query = useQuery({ queryKey: ['workDays'],queryFn: ({ signal }) => read(owner,signal) });
  displays.push({ owner,data: query.data });
  return <span>{query.data ?? 'Завантаження'}</span>;
};
const App = () => <AccountDataProvider><Rows /></AccountDataProvider>;
beforeEach(() => { auth.owner = 'A'; read.mockReset().mockImplementation(async owner => `дані ${owner}`); displays.length = 0; safeStorage.clear(); });
afterEach(() => { cleanup(); safeStorage.clear(); });
describe('ізоляція кешу акаунтів', () => {
  it('не показує записи A користувачу B навіть на один кадр', async () => {
    const view = render(<App />); await waitFor(() => expect(screen.getByText('дані A')).toBeTruthy());
    auth.owner = 'B'; view.rerender(<App />);
    expect(screen.queryByText('дані A')).toBeNull();
    await waitFor(() => expect(screen.getByText('дані B')).toBeTruthy());
    expect(displays.some(row => row.owner === 'B' && row.data === 'дані A')).toBe(false);
  });
  it('пізня відповідь старого запиту не потрапляє в новий акаунт', async () => {
    let resolveA: (value: string) => void = () => {};
    let oldSignal: AbortSignal | undefined;
    read.mockImplementation((owner,signal) => owner === 'A' ? new Promise(resolve => { resolveA = resolve; oldSignal = signal; }) : Promise.resolve('дані B'));
    const view = render(<App />); await waitFor(() => expect(read).toHaveBeenCalled());
    auth.owner = 'B'; view.rerender(<App />); await waitFor(() => expect(screen.getByText('дані B')).toBeTruthy());
    expect(oldSignal?.aborted).toBe(true); resolveA('дані A');
    await waitFor(() => expect(screen.queryByText('дані A')).toBeNull());
  });
  it('після виходу не відновлює попередні дані в гостьовому кеші', async () => {
    const view = render(<App />); await waitFor(() => expect(screen.getByText('дані A')).toBeTruthy());
    auth.owner = null; view.rerender(<App />);
    await waitFor(() => expect(screen.getByText('дані null')).toBeTruthy()); expect(screen.queryByText('дані A')).toBeNull();
  });
  it('видаляє старий спільний кеш до відновлення даних', async () => {
    safeStorage.setItem('aria-query-cache','чужі записи'); render(<App />);
    await waitFor(() => expect(safeStorage.getItem('aria-query-cache')).toBeNull());
  });
});
