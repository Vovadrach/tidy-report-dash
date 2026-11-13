import { useMemo, useState } from 'react';
import { CalendarPlus, Plus, RefreshCw } from 'lucide-react';

import { useI18n } from '@/i18n';
import { useWorkerFilter } from '@/contexts/WorkerContext';
import { useWorkDays, useWorkers, useSetPayment, useAddPayment } from '@/data/queries';
import { workerView, involvesWorker, resolveStatus } from '@/domain/money';
import { periodStats } from '@/domain/stats';
import { monthRange, toISODate } from '@/domain/dates';
import type { PaymentStatus } from '@/domain/types';
import { useToday } from '@/ui/useToday';
import { usePullToRefresh } from '@/ui/usePullToRefresh';
import { QueryError, StaleDataNotice } from '@/ui/QueryError';
import { useGo } from '@/ui/nav';
import { Column, EmptyState, Screen } from '@/ui/Screen';
import { IconButton } from '@/ui/Button';
import { MonthSheet } from '@/ui/MonthSheet';
import { stagger } from '@/ui/motion';
import { cn } from '@/lib/utils';
import { BottomNavigation } from '@/components/BottomNavigation';
import { MonthHeader } from '@/components/home/MonthHeader';
import { WorkerChips } from '@/components/home/WorkerChips';
import { StatTiles } from '@/components/home/StatTiles';
import { DayCard, type DayItem } from '@/components/home/DayCard';

/**
 * Головна — стрічка місяця: підсумок, далі дні від найновішого. Кожен день —
 * підпис (число, день тижня, «Сьогодні») і картка з записами-рядками.
 * Тягнути вниз — оновити. Внизу — фільтр помічниць і док.
 */
export default function Index() {
  const go = useGo();
  const { selectedWorkerId } = useWorkerFilter();
  const { t, weekdays } = useI18n();
  const today = useToday();
  const now = useMemo(() => new Date(today + 'T12:00:00'), [today]);
  const [anchor, setAnchor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [direction, setDirection] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const query = useWorkDays();
  const workersQuery = useWorkers();
  const { pulling, refreshing } = usePullToRefresh(() => Promise.all([query.refetch(), workersQuery.refetch()]));
  const { data: workDays = [], isLoading } = query;
  const setStatus = useSetPayment();
  const addPayment = useAddPayment();
  const pending = setStatus.isPending || addPayment.isPending;
  const changeStatus = async (dayId: string, status: PaymentStatus, paidAmount: number) => {
    await setStatus.mutateAsync({ dayId, status, paidAmount });
  };
  const addPartial = async (dayId: string, amount: number, operationId: string) => {
    await addPayment.mutateAsync({ dayId, amount, operationId });
  };
  const monthPrefix = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`;
  const isCurrent = anchor.getFullYear() === now.getFullYear() && anchor.getMonth() === now.getMonth();
  const days = useMemo<DayItem[]>(() => workDays.filter(d => d.date.startsWith(monthPrefix) && involvesWorker(d, selectedWorkerId)).map(d => {
    const view = workerView(d, selectedWorkerId);
    return { ...d, hours: view.hours, amount: view.amount, paidAmount: view.paid, paymentBalance: { amount: d.amount, paidAmount: d.paidAmount },
      status: resolveStatus(view.paid, view.amount), workers: d.assignments.filter(a => selectedWorkerId === 'all' || a.workerId === selectedWorkerId).map(a => ({ name: a.workerName, color: a.workerColor })) };
  }), [workDays, selectedWorkerId, monthPrefix]);
  const stats = useMemo(() => periodStats(workDays, monthRange(anchor), selectedWorkerId), [workDays, anchor, selectedWorkerId]);
  const groups = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    for (const d of [...days].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))) {
      const group = map.get(d.date) ?? []; group.push(d); map.set(d.date, group);
    }
    return [...map.entries()];
  }, [days]);
  const shiftMonth = (delta: number) => { setDirection(delta); setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + delta, 1)); };
  const openDay = (day: DayItem) => go(day.isPlanned ? `/create-report?clientId=${day.clientId}&date=${day.date}&workDayId=${day.id}` : `/day/${day.id}`);
  const addOnDate = (date: string) => go(`/select-client?date=${date}`);
  if (query.isError && !query.data) return <QueryError onRetry={() => void query.refetch()} />;
  const todayIso = toISODate(now);

  return (
    <Screen>
      <Column className="space-y-4">
        {/* Тягни вниз — оновити: індикатор виїжджає згори й наповнюється разом із жестом */}
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-50 flex justify-center"
          style={{ opacity: refreshing ? 1 : Math.min(1, pulling), transform: `translateY(${refreshing ? 0 : (Math.min(1, pulling) - 1) * 24}px)` }}>
          <p role="status" className="flex items-center gap-2 rounded-full bg-overlay px-3.5 py-1.5 text-footnote font-semibold text-accent-ink shadow-float">
            <RefreshCw size={14} strokeWidth={2.4} className={refreshing ? 'animate-spin' : ''} style={refreshing ? undefined : { transform: `rotate(${pulling * 270}deg)` }} />
            {(pulling > 0 || refreshing) && t('common.refreshing')}
          </p>
        </div>
        <MonthHeader
          date={anchor}
          isCurrent={isCurrent}
          direction={direction}
          onPrev={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
          onToday={() => { setDirection(anchor < now ? 1 : -1); setAnchor(new Date(now.getFullYear(), now.getMonth(), 1)); }}
          onPick={() => setPickerOpen(true)}
        />
        <StatTiles hours={stats.hours} earned={stats.earned} />
      </Column>

      <Column className="space-y-5 pb-[calc(12rem+env(safe-area-inset-bottom))] pt-6">
        {query.isError && query.data && <StaleDataNotice onRetry={() => void query.refetch()} />}
        {isLoading ? (
          <div className="space-y-5">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-2.5">
                <div className="skeleton h-5 w-32 rounded-full" />
                <div className="card space-y-0 overflow-hidden p-0">
                  {[0, 1].map((j) => <div key={j} className="flex items-center gap-3 p-4"><div className="skeleton h-10 w-10 rounded-full" /><div className="skeleton h-4 flex-1 rounded-full" /><div className="skeleton h-4 w-12 rounded-full" /></div>)}
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<CalendarPlus size={26} strokeWidth={2} />}
            title={t('home.empty.title')}
            subtitle={t('home.empty.sub')}
            action={<IconButton label={t('nav.create')} variant="primary" size="lg" onClick={() => go('/select-client')}><Plus size={24} strokeWidth={2.5} /></IconButton>}
          />
        ) : (
          groups.map(([date, items], groupIndex) => {
            const [y, m, dd] = date.split('-').map(Number);
            const dow = weekdays[new Date(y, m - 1, dd).getDay()];
            const isToday = todayIso === date;
            return (
              <section key={date} className="rise-in space-y-2" style={stagger(groupIndex, 0.04, 0.28)}>
                <div className="flex items-center gap-2.5 px-1">
                  <span className={cn('num text-[1.375rem] font-bold leading-none tracking-tight', isToday ? 'text-accent-ink' : 'text-ink')}>{dd}</span>
                  <span className={cn('text-callout font-semibold', isToday ? 'text-accent-ink' : 'text-ink-2')}>{dow}</span>
                  {isToday && <span className="rounded-full bg-accent-tint px-2 py-0.5 text-caption font-semibold text-accent-ink">{t('common.today')}</span>}
                  <span className="flex-1" />
                  <IconButton label={t('home.addOnDay')} variant="ghost" size="sm" onClick={() => addOnDate(date)} className="-mr-1 text-ink-3">
                    <CalendarPlus size={18} strokeWidth={2} />
                  </IconButton>
                </div>
                <div className="card list overflow-hidden [--list-inset:4.25rem]">
                  {items.map((d) => (
                    <DayCard
                      key={`${d.reportId}-${d.id}`}
                      day={d}
                      onOpen={() => openDay(d)}
                      onStatus={changeStatus}
                      onAddPartial={addPartial}
                      pending={pending}
                      canEdit={selectedWorkerId === 'all'}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </Column>

      <MonthSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        now={now}
        value={{ year: anchor.getFullYear(), month: anchor.getMonth() }}
        onPick={(pick) => {
          if (!pick || pick.month === null) return;
          const next = new Date(pick.year, pick.month, 1);
          setDirection(next < anchor ? -1 : 1);
          setAnchor(next);
        }}
      />
      <BottomNavigation above={<WorkerChips />} />
    </Screen>
  );
}
