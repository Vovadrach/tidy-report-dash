// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateReport from './CreateReport';
import { LanguageProvider } from '@/i18n';

const data = vi.hoisted(() => ({
  clients: [{ id: 'c1', name: 'Клієнт', hourlyRate: 12 }],
  workDays: [] as import("@/domain/types").WorkDay[],
  workers: [],
  mutate: vi.fn(),
}));

vi.mock('@/data/queries', () => ({
  useClients: () => ({ data: data.clients }),
  useWorkers: () => ({ data: data.workers }),
  useWorkDays: () => ({ data: data.workDays }),
  useCreateWorkEntry: () => ({ mutate: data.mutate }),
  useDeleteWorkDay: () => ({ mutate: data.mutate }),
  useSaveWorkEntry: () => ({ mutate: data.mutate }),
  useUpdateWorkDayFields: () => ({ mutate: data.mutate }),
}));
vi.mock('@/components/WorkerAssignmentDialog', () => ({ WorkerAssignmentDialog: () => null }));

const Form = () => {
  const navigate = useNavigate();
  return <>
    <button onClick={() => navigate('/create-report?clientId=c1')}>Новий запис</button>
    <CreateReport />
  </>;
};

const open = (path = '/create-report?clientId=c1') => render(
  <LanguageProvider><RouterProvider router={createMemoryRouter([{ path: '*', element: <Form /> }], { initialEntries: [path] })} /></LanguageProvider>,
);
const dateInput = () => screen.getByLabelText('Дата запису') as HTMLInputElement;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 3, 23, 50));
  data.workDays = [];
  data.mutate.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('дата нового запису', () => {
  it('одразу підставляє поточну локальну дату', () => {
    open();
    expect(dateInput().value).toBe('2026-10-03');
  });

  it('бере дату в момент відкриття форми після зміни дня', () => {
    vi.setSystemTime(new Date(2026, 9, 4, 0, 5));
    open();
    expect(dateInput().value).toBe('2026-10-04');
  });

  it('зберігає явно обрану дату з календаря', () => {
    open('/create-report?clientId=c1&date=2026-09-25');
    expect(dateInput().value).toBe('2026-09-25');
  });

  it('скидає попередню дату при переході до нового запису', () => {
    open('/create-report?clientId=c1&date=2026-09-25');
    vi.setSystemTime(new Date(2026, 9, 4, 0, 5));
    fireEvent.click(screen.getByRole('button', { name: 'Новий запис' }));
    expect(dateInput().value).toBe('2026-10-04');
  });

  it('зберігає вручну змінену дату під час заповнення і створення', () => {
    open();
    fireEvent.change(dateInput(), { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByLabelText('Нотатка'), { target: { value: 'Прибирання' } });
    fireEvent.click(screen.getByRole('button', { name: 'Запланувати роботу' }));
    expect(data.mutate).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-09-30' }), expect.anything());
  });
});

describe('точність і стійкість створення', () => {
  it('після скасування виходу дозволяє підтвердити повернення без створення запису', async () => {
    const router = createMemoryRouter([
      { path: '/select-client', element: <h1>Оберіть клієнта</h1> },
      { path: '/create-report', element: <CreateReport /> },
    ], {
      initialEntries: ['/select-client', '/create-report?clientId=c1'],
      initialIndex: 1,
    });
    render(<LanguageProvider><RouterProvider router={router} /></LanguageProvider>);
    fireEvent.change(screen.getByLabelText('Нотатка'), { target: { value: 'Незбережена нотатка' } });
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    fireEvent.click(screen.getByRole('button', { name: 'Скасувати' }));
    expect((screen.getByLabelText('Нотатка') as HTMLTextAreaElement).value).toBe('Незбережена нотатка');
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    fireEvent.click(screen.getByRole('button', { name: 'Залишити' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Оберіть клієнта' })).toBeTruthy());
    expect(screen.queryByText('Залишити незбережений запис?')).toBeNull();
    expect(data.mutate).not.toHaveBeenCalled();
  });
  it('захищає введені дані від випадкового переходу', () => {
    open('/create-report?clientId=c1&date=2026-09-25');
    fireEvent.change(screen.getByLabelText('Сума запису'), { target: { value: '14.25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Новий запис' }));
    expect(screen.getByText('Залишити незбережений запис?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Скасувати' }));
    expect((screen.getByLabelText('Сума запису') as HTMLInputElement).value).toBe('14.25');
    expect(dateInput().value).toBe('2026-09-25');
  });
  it('зберігає вручну введені копійки після втрати фокусу', () => {
    open();
    const amount = screen.getByLabelText('Сума запису');
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: '14.25' } });
    fireEvent.blur(amount);
    expect((amount as HTMLInputElement).value).toBe("14.25");
    fireEvent.click(screen.getByRole('button', { name: 'Створити запис' }));
    expect(data.mutate).toHaveBeenCalledWith(expect.objectContaining({ amount: 14.25, hours: 14.25 / 12 }), expect.anything());
  });
  it('не створює два записи при подвійному натисканні', () => {
    open();
    const button = screen.getByRole('button', { name: 'Запланувати роботу' });
    fireEvent.click(button); fireEvent.click(button);
    expect(data.mutate).toHaveBeenCalledTimes(1);
  });
  it('повторює невдалу спробу з тим самим ключем операції', () => {
    open(); fireEvent.click(screen.getByRole('button', { name: 'Запланувати роботу' }));
    const first = data.mutate.mock.calls[0][0];
    data.mutate.mock.calls[0][1].onSettled();
    fireEvent.click(screen.getByRole('button', { name: 'Запланувати роботу' }));
    expect(data.mutate.mock.calls[1][0].requestId).toBe(first.requestId);
  });
  it('не скидає ручну ставку при оновленні списку клієнтів', () => {
    open();
    fireEvent.change(screen.getByLabelText('Ставка за годину'), { target: { value: '15.75' } });
    data.clients = [...data.clients.map(client => ({ ...client }))];
    fireEvent.change(screen.getByLabelText('Нотатка'), { target: { value: 'Без скидання ставки' } });
    expect((screen.getByLabelText("Ставка за годину") as HTMLInputElement).value).toBe("15.75");
  });
  it('завершує план однією операцією разом з обраною оплатою', () => {
    data.workDays = [{ id: 'p1',reportId: 'r1',clientId: 'c1',clientName: 'Клієнт',date: '2026-10-05',hours: 0,amount: 0,paidAmount: 0,status: 'unpaid',isPlanned: true,assignments: [] }];
    open('/create-report?clientId=c1&workDayId=p1');
    fireEvent.change(screen.getByLabelText('Сума запису'), { target: { value: '24.75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Оплачено' }));
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти запис' }));
    expect(data.mutate).toHaveBeenCalledWith(expect.objectContaining({ dayId: 'p1',entry: expect.objectContaining({ amount: 24.75,paidAmount: 24.75,status: 'paid',isPlanned: false }) }), expect.anything());
  });
  it('оновлення кешу після завершення плану не змінює маршрут перед відповіддю форми', () => {
    data.workDays = [{ id: 'p1',reportId: 'r1',clientId: 'c1',clientName: 'Клієнт',date: '2026-10-05',hours: 0,amount: 0,paidAmount: 0,status: 'unpaid',isPlanned: true,assignments: [] }];
    open('/create-report?clientId=c1&workDayId=p1');
    fireEvent.change(screen.getByLabelText('Сума запису'),{ target: { value: '24.75' } });
    fireEvent.click(screen.getByRole('button',{ name: 'Зберегти запис' }));
    data.workDays = data.workDays.map(day => ({ ...day,isPlanned: false,hours: 2.0625,amount: 24.75 }));
    fireEvent.change(screen.getByLabelText('Нотатка'),{ target: { value: 'Кеш підтвердив завершення' } });
    expect(screen.getByRole('button',{ name: 'Зберегти запис' })).toBeTruthy();
  });
});
