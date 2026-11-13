// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/i18n';
import type { WorkDay } from '@/domain/types';
import ClientReports from './ClientReports';
import ReportsStatus from './ReportsStatus';

const data = vi.hoisted(() => ({ days: [] as WorkDay[], worker: 'all', markAllPaid: vi.fn() }));
vi.mock('@/data/queries', () => ({
  useWorkDays: () => ({ data: data.days }),
  useClients: () => ({ data: [{ id: 'c1', name: 'Barbara Rina di Natale', hourlyRate: 15 }] }),
  useSetPayment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddPayment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMarkAllPaid: () => ({ mutateAsync: data.markAllPaid, isPending: false }),
}));
vi.mock('@/contexts/WorkerContext', () => ({ useWorkerFilter: () => ({ selectedWorkerId: data.worker }) }));
vi.mock('@/components/BottomNavigation', () => ({ BottomNavigation: () => null }));
vi.mock('@number-flow/react', () => ({
  default: ({ value, 'aria-label': label }: { value: number; 'aria-label': string }) => <span aria-label={label}>{value}</span>,
}));

const day = (over: Partial<WorkDay> = {}): WorkDay => ({
  id: 'due', reportId: 'r1', clientId: 'c1', clientName: 'Barbara Rina di Natale', date: '2026-08-08',
  hours: 2, amount: 30, paidAmount: 12, status: 'partial', isPlanned: false, assignments: [], ...over,
});
const photographedDays = () => [
  { date: '2026-08-07', hours: 100 / 60, amount: 25, paidAmount: 24.82 },
  { date: '2026-07-31', hours: 1, amount: 15, paidAmount: 14.8 },
  { date: '2026-07-16', hours: 112 / 60, amount: 28, paidAmount: 27.63 },
  { date: '2026-07-03', hours: 2.5, amount: 37.5, paidAmount: 37 },
  { date: '2026-05-30', hours: 2.5, amount: 37.5, paidAmount: 37 },
].map((values, i) => day({ ...values, id: `old${i}`, status: 'paid' }));

const open = (path: string) => render(<LanguageProvider><RouterProvider router={createMemoryRouter([
  { path: '/reports-status', element: <ReportsStatus /> },
  { path: '/client-reports/:clientId', element: <ClientReports /> },
], { initialEntries: [path] })} /></LanguageProvider>);

beforeEach(() => {
  localStorage.setItem('lang', 'uk');
  data.days = photographedDays();
  data.worker = 'all';
  data.markAllPaid.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('узгоджені борги та години на обох екранах', () => {
  it('залишки з фото не показують боржника у загальному списку', () => {
    open('/reports-status');
    expect(screen.getByText('Немає боргів')).toBeTruthy();
    expect(screen.queryByText('Barbara Rina di Natale')).toBeNull();
  });

  it('залишки з фото не пропонує оплачувати вдруге у картці клієнта', () => {
    open('/client-reports/c1');
    expect(screen.getByText('Немає боргів у цього клієнта')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Оплачено всі/ })).toBeNull();
  });

  it('підсумок показує повний час роботи з реальним боргом', () => {
    data.days.push(day());
    open('/reports-status');
    expect(screen.getByText('за 2 год роботи')).toBeTruthy();
    expect(screen.getAllByLabelText('18')).toHaveLength(2);
  });

  it('картка клієнта рахує ті самі години й оплачує лише реальний борг', async () => {
    const owing = day({ status: 'paid' }); // Stale legacy flags must not show a paid icon for debt.
    data.days.push(owing);
    open('/client-reports/c1');
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('2 год')).toBeTruthy();
    expect(screen.getAllByLabelText('18')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Статус' }).dataset.status).toBe('partial');
    fireEvent.click(screen.getByRole('button', { name: /Оплачено всі \(1\)/ }));
    await waitFor(() => expect(data.markAllPaid).toHaveBeenCalledWith([owing]));
  });

  it('фільтр працівниці показує її частку суми та повний її час', () => {
    data.worker = 'w1';
    data.days.push(day({ assignments: [
      { id: 'a1', workerId: 'w1', workerName: 'А', workerColor: '#000000', hours: 1, amount: 15 },
      { id: 'a2', workerId: 'w2', workerName: 'Б', workerColor: '#000000', hours: 1, amount: 15 },
    ] }));
    open('/reports-status');
    expect(screen.getByText('за 1 год роботи')).toBeTruthy();
    expect(screen.getAllByLabelText('9')).toHaveLength(2);
  });
});
