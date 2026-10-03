import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages, fetchCursorPages } from '../pagination';
describe('довга історія та скасування запитів', () => {
  it('новий запис з іншого пристрою не зсуває вже прочитані сторінки', async () => {
    const rows = Array.from({ length: 1001 },(_,i) => ({ id: String(i).padStart(4,'0') }));
    let calls = 0;
    const result = await fetchCursorPages(async (after,size) => {
      const page = rows.filter(row => !after || row.id > after.id).slice(0,size);
      if (calls++ === 0) rows.unshift({ id: '-new' });
      return { data: page,error: null };
    });
    expect(result).toHaveLength(1001); expect(new Set(result.map(row => row.id)).size).toBe(1001);
  });
  it('не зациклюється, якщо сервер повторює ту саму сторінку', async () => {
    const data = Array.from({ length: 500 },(_,i) => ({ id: String(i) }));
    await expect(fetchCursorPages(async () => ({ data,error: null }))).rejects.toThrow('продовжити');
  });
  it('завантажує понад 1000 записів без пропусків', async () => {
    const rows = Array.from({ length: 1503 },(_,i) => i);
    const read = vi.fn(async (from: number,to: number) => ({ data: rows.slice(from,to+1),error: null }));
    expect(await fetchAllPages(read)).toEqual(rows); expect(read).toHaveBeenCalledTimes(4);
  });
  it('не показує неповну історію як успішний результат', async () => {
    const read = vi.fn().mockResolvedValueOnce({ data: Array(500).fill(0),error: null }).mockResolvedValueOnce({ data: null,error: new Error('network') });
    await expect(fetchAllPages(read)).rejects.toThrow('network');
  });
  it('скасовує читання при зміні акаунта чи маршруту', async () => {
    const controller = new AbortController();
    const read = vi.fn(async () => { controller.abort(); return { data: Array(500).fill(0),error: null }; });
    await expect(fetchAllPages(read,controller.signal)).rejects.toThrow(); expect(read).toHaveBeenCalledTimes(1);
  });
});
