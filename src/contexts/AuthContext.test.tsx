// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider } from './AuthContext';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('@/data', () => ({ isDemo: false }));

const session = { user: { id: 'worker-1' } } as Session;
let notify: (event: string, nextSession: Session | null) => void;

const renderApp = () => render(
  <AuthProvider>
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><h1>Робочі записи</h1></ProtectedRoute>} />
        <Route path="/login" element={<h1>Вхід</h1>} />
      </Routes>
    </MemoryRouter>
  </AuthProvider>,
);

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  auth.onAuthStateChange.mockImplementation((callback) => {
    notify = callback;
    return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('запуск застосунку', () => {
  it('відкриває записи зі збереженою сесією', async () => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    renderApp();
    await act(async () => {});
    expect(screen.getByRole('heading', { name: 'Робочі записи' })).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('відкриває вхід, якщо сесії немає', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    renderApp();
    await act(async () => {});
    expect(screen.getByRole('heading', { name: 'Вхід' })).toBeTruthy();
  });

  it('показує повторну спробу замість нескінченного очікування', async () => {
    auth.getSession.mockReturnValue(new Promise(() => {}));
    renderApp();
    expect(screen.getByText('Завантаження...')).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(12_000); });
    expect(screen.queryByText('Завантаження...')).toBeNull();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Спробувати знову' })).toBeTruthy();
  });

  it.each(['returned', 'rejected'])('завершує завантаження при помилці %s', async (kind) => {
    if (kind === 'returned') {
      auth.getSession.mockResolvedValue({ data: { session: null }, error: new Error('offline') });
    } else {
      auth.getSession.mockRejectedValue(new Error('offline'));
    }
    renderApp();
    await act(async () => {});
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Завантаження...')).toBeNull();
  });

  it('продовжує запуск, якщо сесія відновилася після тайм-ауту', async () => {
    auth.getSession.mockReturnValue(new Promise(() => {}));
    renderApp();
    await act(async () => { vi.advanceTimersByTime(12_000); });
    expect(screen.getByRole('alert')).toBeTruthy();
    act(() => notify('SIGNED_IN', session));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Робочі записи' })).toBeTruthy();
  });

  it('не перезаписує вихід застарілою відповіддю відновлення сесії', async () => {
    let resolve: (value: unknown) => void;
    auth.getSession.mockReturnValue(new Promise((done) => { resolve = done; }));
    renderApp();
    act(() => notify('SIGNED_OUT', null));
    await act(async () => { resolve({ data: { session }, error: null }); });
    expect(screen.getByRole('heading', { name: 'Вхід' })).toBeTruthy();
    expect(screen.queryByText('Робочі записи')).toBeNull();
  });

  it('прибирає таймер і підписку при закритті', () => {
    auth.getSession.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderApp();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(auth.unsubscribe).toHaveBeenCalledOnce();
  });
});
