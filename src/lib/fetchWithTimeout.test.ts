import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout } from './fetchWithTimeout';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('обмеження мережевого очікування', () => {
  it('перериває запит, якщо сервер не відповів за 10 секунд', async () => {
    vi.stubGlobal('fetch', vi.fn((_input, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(init.signal!.reason));
    })));
    const result = expect(fetchWithTimeout('https://example.com')).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('зберігає скасування запиту викликачем', async () => {
    vi.stubGlobal('fetch', vi.fn((_input, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(init.signal!.reason));
    })));
    const controller = new AbortController();
    const result = expect(fetchWithTimeout('https://example.com', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('повертає відповідь і прибирає таймер після успіху', async () => {
    const response = new Response('ok');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    expect(await fetchWithTimeout('https://example.com')).toBe(response);
    expect(vi.getTimerCount()).toBe(0);
  });
});
