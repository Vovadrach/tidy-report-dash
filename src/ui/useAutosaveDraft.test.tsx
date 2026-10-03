// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutosaveDraft } from './useAutosaveDraft';
import { safeStorage } from '@/lib/storage';
const save = vi.fn<(draft: { note: string }) => Promise<void>>();
const Form = () => {
  const draft = useAutosaveDraft('aria-draft:A:d1',{ note: 'Початкова' },save);
  return <><input aria-label="Нотатка" value={draft.draft.note} onChange={e => draft.update({ note: e.target.value })} />
    <span>{draft.error ? 'Помилка' : draft.dirty ? 'Є зміни' : 'Збережено'}</span>
    <button onClick={() => void draft.saveNow().catch(() => {})}>Повторити</button><Link to="/next">Далі</Link></>;
};
const open = () => render(<RouterProvider router={createMemoryRouter([{ path: '/',element: <Form /> },{ path: '/next',element: <div>Інша сторінка</div> }])} />);
beforeEach(() => { vi.useFakeTimers(); save.mockReset().mockResolvedValue(); safeStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); safeStorage.clear(); });
describe('чернетки та автозбереження', () => {
  it('не зберігає порожні поля при першому відкритті', async () => {
    open(); await act(() => vi.advanceTimersByTimeAsync(900)); expect(save).not.toHaveBeenCalled();
  });
  it('об’єднує швидкі зміни й зберігає останню версію', async () => {
    open(); fireEvent.change(screen.getByLabelText('Нотатка'),{ target: { value: 'А' } });
    fireEvent.change(screen.getByLabelText('Нотатка'),{ target: { value: 'Б' } });
    await act(() => vi.advanceTimersByTimeAsync(900)); expect(save).toHaveBeenCalledTimes(1); expect(save).toHaveBeenCalledWith({ note: 'Б' });
  });
  it('зберігає перед переходом, навіть до закінчення затримки', async () => {
    open(); fireEvent.change(screen.getByLabelText('Нотатка'),{ target: { value: 'Важлива' } });
    await act(async () => { fireEvent.click(screen.getByText('Далі')); });
    expect(save).toHaveBeenCalledWith({ note: 'Важлива' }); expect(screen.getByText('Інша сторінка')).toBeTruthy();
  });
  it('після збою не залишає форму й дозволяє повторити', async () => {
    save.mockRejectedValueOnce(new Error('offline'));
    open(); fireEvent.change(screen.getByLabelText('Нотатка'),{ target: { value: 'Не загубити' } });
    await act(async () => { fireEvent.click(screen.getByText('Далі')); });
    expect(screen.getByText('Помилка')).toBeTruthy();
    expect(safeStorage.getItem('aria-draft:A:d1')).toContain('Не загубити');
    await act(async () => { fireEvent.click(screen.getByText('Повторити')); });
    expect(screen.getByText('Інша сторінка')).toBeTruthy(); expect(safeStorage.getItem('aria-draft:A:d1')).toBeNull();
  });
  it('відновлює чернетку після закриття сторінки', () => {
    const first = open(); fireEvent.change(screen.getByLabelText('Нотатка'),{ target: { value: 'Відновити' } }); first.unmount();
    open(); expect((screen.getByLabelText('Нотатка') as HTMLInputElement).value).toBe('Відновити');
  });
});
