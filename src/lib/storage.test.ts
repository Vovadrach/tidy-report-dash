// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountCacheKey, clearAccountStorage, readStringArray, safeStorage } from './storage';
afterEach(() => { vi.restoreAllMocks(); safeStorage.clear(); });
describe('стійке сховище', () => {
  it('пошкоджені налаштування не ламають запуск', () => {
    localStorage.setItem('recent','{broken'); expect(readStringArray('recent')).toEqual([]);
    localStorage.setItem('recent','{"unexpected":true}'); expect(readStringArray('recent')).toEqual([]);
    localStorage.setItem('recent','["w1",null,15,"w2"]'); expect(readStringArray('recent')).toEqual(['w1','w2']);
  });
  it('працює в поточній сесії навіть коли сховище заборонене', () => {
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => { throw new DOMException('Denied'); });
    vi.spyOn(Storage.prototype,'getItem').mockImplementation(() => { throw new DOMException('Denied'); });
    safeStorage.setItem('session','value'); expect(safeStorage.getItem('session')).toBe('value');
    safeStorage.removeItem('session'); expect(safeStorage.getItem('session')).toBeNull();
  });
  it('вихід очищає тільки дані поточного користувача', () => {
    safeStorage.setItem(accountCacheKey('A'),'records-A'); safeStorage.setItem(accountCacheKey('B'),'records-B');
    safeStorage.setItem('aria-draft:A:d1','note-A'); safeStorage.setItem('aria-draft:B:d1','note-B');
    clearAccountStorage('A');
    expect(safeStorage.getItem(accountCacheKey('A'))).toBeNull(); expect(safeStorage.getItem('aria-draft:A:d1')).toBeNull();
    expect(safeStorage.getItem(accountCacheKey('B'))).toBe('records-B'); expect(safeStorage.getItem('aria-draft:B:d1')).toBe('note-B');
  });
});
