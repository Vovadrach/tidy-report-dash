// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { LanguageProvider } from '@/i18n';
import { DayCard, type DayItem } from './DayCard';

vi.mock('@number-flow/react', () => ({ default: ({ value }: { value: number }) => <span>{value}</span> }));
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button>,
}));
afterEach(cleanup);
const day: DayItem = { id: 'd1',reportId: 'r1',clientId: 'c1',clientName: 'Клієнт',date: '2026-10-03',hours: 2,amount: 24.75,paidAmount: 4.25,status: 'partial',isPlanned: false,workers: [] };
const open = (onAddPartial = vi.fn().mockResolvedValue(undefined),canEdit = true) => {
  const onStatus = vi.fn().mockResolvedValue(undefined);
  render(<LanguageProvider><DayCard day={day} index={0} onOpen={() => {}} onStatus={onStatus} onAddPartial={onAddPartial} canEdit={canEdit} /></LanguageProvider>);
  return { onStatus,onAddPartial };
};
const partial = () => fireEvent.click(screen.getByRole('button',{ name: 'Частково…' }));

describe('картка GitHub UI з новими правилами оплат', () => {
  it('показує копійки без округлення до євро', () => {
    open(); expect(screen.getByText('24.75')).toBeTruthy();
  });
  it('додає нову оплату, а не замінює вже отриману суму', async () => {
    const { onStatus,onAddPartial } = open(); partial();
    fireEvent.change(screen.getByLabelText('Отримано, €'),{ target: { value: '1,25' } });
    fireEvent.click(screen.getByRole('button',{ name: 'Додати' }));
    await waitFor(() => expect(onAddPartial).toHaveBeenCalledWith('d1',1.25,expect.any(String)));
    expect(onStatus).not.toHaveBeenCalled();
  });
  it('зберігає введену суму й ключ операції після помилки', async () => {
    const add = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    open(add); partial();
    fireEvent.change(screen.getByLabelText('Отримано, €'),{ target: { value: '1.25' } });
    fireEvent.click(screen.getByRole('button',{ name: 'Додати' }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    expect((screen.getByLabelText('Отримано, €') as HTMLInputElement).value).toBe('1.25');
    fireEvent.click(screen.getByRole('button',{ name: 'Додати' }));
    await waitFor(() => expect(add).toHaveBeenCalledTimes(2));
    expect(add.mock.calls[1][2]).toBe(add.mock.calls[0][2]);
  });
  it('не приймає більше залишку', () => {
    const { onAddPartial } = open(); partial();
    fireEvent.change(screen.getByLabelText('Отримано, €'),{ target: { value: '21' } });
    fireEvent.click(screen.getByRole('button',{ name: 'Додати' }));
    expect(onAddPartial).not.toHaveBeenCalled();
  });
  it('фільтр працівниці не дозволяє змінювати оплату всього дня', () => {
    const { onStatus } = open(undefined,false);
    fireEvent.click(screen.getByRole('button',{ name: 'Оплачено' }));
    expect(onStatus).not.toHaveBeenCalled();
    expect((screen.getByRole('button',{ name: 'Статус' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
