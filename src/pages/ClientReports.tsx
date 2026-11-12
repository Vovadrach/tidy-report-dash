import { useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCheck, CircleCheck } from 'lucide-react';
import { MoneyNumber } from '@/ui/MoneyNumber';
import { useI18n } from '@/i18n';
import { useWorkerFilter } from '@/contexts/WorkerContext';
import { useWorkDays, useClients, useSetPayment, useAddPayment, useMarkAllPaid } from '@/data/queries';
import { workerView, involvesWorker, resolveStatus, formatMoney } from '@/domain/money';
import { decimalToHours } from '@/domain/time';
import type { WorkDay, PaymentStatus } from '@/domain/types';
import { QueryError, StaleDataNotice } from '@/ui/QueryError';
import { useGo } from '@/ui/nav';
import { useToday } from '@/ui/useToday';
import { dayLabel } from '@/ui/dateLabel';
import { Column, EmptyState, Screen, SectionLabel, TopBar } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { ClientAvatar } from '@/ui/Avatar';
import { stagger } from '@/ui/motion';
import { BottomNavigation } from '@/components/BottomNavigation';
import { DayCard, type DayItem } from '@/components/home/DayCard';

/**
 * Борги одного клієнта: скільки й за які дні. Кожен день — той самий рядок, що
 * в стрічці (кільце оплати → лист оплати), але з датою й залишком.
 * «Оплачено всі» закриває весь борг однією дією.
 */
export default function ClientReports() {
  const { clientId } = useParams();
  const go = useGo();
  const { selectedWorkerId } = useWorkerFilter();
  const i18n = useI18n();
  const { t } = i18n;
  const today = useToday();
  const query = useWorkDays();
  const clientsQuery = useClients();
  const client = clientsQuery.data?.find(c => c.id === clientId);
  const loading = query.isLoading || clientsQuery.isLoading;
  const setPayment = useSetPayment();
  const addPayment = useAddPayment();
  const bulk = useMarkAllPaid();
  const busy = useRef(false);
  const pending = setPayment.isPending || bulk.isPending || !!addPayment.isPending;
  const days = useMemo(() => (query.data ?? []).filter(d => d.clientId === clientId && !d.isPlanned && involvesWorker(d, selectedWorkerId) && workerView(d, selectedWorkerId).due > 0).sort((a, b) => b.date.localeCompare(a.date)), [query.data, clientId, selectedWorkerId]);
  const remainingOf = (day: WorkDay) => workerView(day, selectedWorkerId).due;
  const totalDue = days.reduce((n, d) => n + remainingOf(d), 0);
  const totalHours = days.reduce((minutes, d) => minutes + Math.round(workerView(d, selectedWorkerId).hours * 60), 0) / 60;
  const items = useMemo<DayItem[]>(() => days.map(d => {
    const view = workerView(d, selectedWorkerId);
    return { ...d, hours: view.hours, amount: view.amount, paidAmount: view.paid, paymentBalance: { amount: d.amount, paidAmount: d.paidAmount },
      status: resolveStatus(view.paid, view.amount), workers: [] };
  }), [days, selectedWorkerId]);

  const changeStatus = async (dayId: string, status: PaymentStatus, paidAmount: number) => {
    if (busy.current || pending || selectedWorkerId !== 'all') return;
    busy.current = true;
    try { await setPayment.mutateAsync({ dayId, status, paidAmount }); } finally { busy.current = false; }
  };
  const addPartial = async (dayId: string, amount: number, operationId: string) => {
    await addPayment.mutateAsync({ dayId, amount, operationId });
  };
  const markAllPaid = async () => {
    if (busy.current || pending || selectedWorkerId !== 'all' || !days.length) return;
    busy.current = true;
    try { await bulk.mutateAsync(days); } catch { /* mutation reports error */ } finally { busy.current = false; }
  };
  if ((query.isError && !query.data) || (clientsQuery.isError && !clientsQuery.data)) return <QueryError onRetry={() => { void query.refetch(); void clientsQuery.refetch(); }} />;
  if (!loading && !client) return <QueryError message={t('client.notFound')} onRetry={() => go('/reports-status', 'back')} />;
  return (
    <Screen>
      <TopBar
        onBack={() => go('/reports-status', 'back')}
        backLabel={t('common.back')}
        leading={client && <ClientAvatar name={client.name} id={client.id} transitionName={`avatar-${clientId}`} />}
        title={client?.name || t('client.notFound')}
        subtitle={client ? `${formatMoney(client.hourlyRate)} ${t('common.perHour')}` : undefined}
      />

      <Column className="space-y-5 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-2">
        {(query.isError || clientsQuery.isError) && <StaleDataNotice onRetry={() => { void query.refetch(); void clientsQuery.refetch(); }} />}
        {loading ? (
          <>
            <div className="skeleton h-40 rounded-[20px]" />
            <div className="skeleton h-32 rounded-[20px]" />
          </>
        ) : !days.length ? (
          <EmptyState tone="ok" icon={<CircleCheck size={26} strokeWidth={2} />} title={t('client.allPaid')} subtitle={t('client.noDebts')} />
        ) : (
          <>
            <div className="card rise-in p-4">
              <div className="grid grid-cols-2">
                <div className="px-1">
                  <p className="text-footnote font-semibold text-ink-3">{t('client.debt')}</p>
                  <p className="num mt-1 text-display text-alert-ink"><MoneyNumber value={totalDue} /><span className="ml-1 text-title font-semibold">€</span></p>
                </div>
                <div className="relative px-4 before:absolute before:inset-y-1 before:left-0 before:w-px before:bg-line">
                  <p className="text-footnote font-semibold text-ink-3">{t('common.hours')}</p>
                  <p className="num mt-1 text-display text-ink">{decimalToHours(totalHours)}</p>
                </div>
              </div>
              <Button variant="tonal" tone="ok" size="lg" block className="mt-4" icon={<CheckCheck size={19} strokeWidth={2.4} />}
                disabled={pending || selectedWorkerId !== 'all'} onClick={markAllPaid}>
                {t('client.markAllPaid', { n: days.length })}
              </Button>
            </div>

            <div className="space-y-2">
              <SectionLabel>{t('client.unpaidDays')}</SectionLabel>
              <div className="card list overflow-hidden [--list-inset:4.25rem]">
                {items.map((day, i) => (
                  <div key={`${day.reportId}-${day.id}`} className="rise-in" style={stagger(i)}>
                    <DayCard
                      day={day}
                      title={dayLabel(day.date, today, i18n)}
                      mode="due"
                      onOpen={() => go(`/day/${day.id}`)}
                      onStatus={changeStatus}
                      onAddPartial={addPartial}
                      pending={pending}
                      canEdit={selectedWorkerId === 'all'}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Column>

      <BottomNavigation />
    </Screen>
  );
}
