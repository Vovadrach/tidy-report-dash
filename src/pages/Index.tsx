import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
import { BottomNavigation } from '@/components/BottomNavigation';
import { CalendarPlus } from 'lucide-react';
import { MonthHeader } from '@/components/home/MonthHeader';
import { WorkerChips } from '@/components/home/WorkerChips';
import { StatTiles } from '@/components/home/StatTiles';
import { DayCard, type DayItem } from '@/components/home/DayCard';

export default function Index() {
  const navigate = useNavigate();
  const { selectedWorkerId } = useWorkerFilter();
  const { t, weekdays } = useI18n();
  const today = useToday();
  const now = useMemo(() => new Date(today + 'T12:00:00'), [today]);
  const [anchor, setAnchor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
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
    return { ...d, hours: view.hours, amount: view.amount, paidAmount: view.paid,
      status: resolveStatus(view.paid, view.amount), workers: d.assignments.filter(a => selectedWorkerId === 'all' || a.workerId === selectedWorkerId).map(a => ({ name: a.workerName, color: a.workerColor })) };
  }), [workDays, selectedWorkerId, monthPrefix]);
  const stats = useMemo(() => periodStats(workDays, monthRange(anchor), selectedWorkerId), [workDays, anchor, selectedWorkerId]);
  const groups = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    for (const d of [...days].sort((a,b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))) {
      const group = map.get(d.date) ?? []; group.push(d); map.set(d.date, group);
    }
    return [...map.entries()];
  }, [days]);
  const openDay = (day: DayItem) => navigate(day.isPlanned ? `/create-report?clientId=${day.clientId}&date=${day.date}&workDayId=${day.id}` : `/day/${day.id}`, { viewTransition: true });
  const addOnDate = (date: string) => navigate(`/select-client?date=${date}`, { viewTransition: true });
  if (query.isError && !query.data) return <QueryError onRetry={() => void query.refetch()} />;
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto max-w-md space-y-3.5 px-4 pt-3">
        {(pulling > 0 || refreshing) && <p role="status" className="text-center text-xs font-semibold text-primary">{t('common.refreshing')}</p>}
        <MonthHeader
          date={anchor}
          isCurrent={isCurrent}
          onPrev={() => setAnchor((a) => new Date(a.getFullYear(), a.getMonth() - 1, 1))}
          onNext={() => setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + 1, 1))}
          onToday={() => setAnchor(new Date(now.getFullYear(), now.getMonth(), 1))}
        />
        <StatTiles hours={stats.hours} earned={stats.earned} />
      </header>

      <main className="mx-auto max-w-md space-y-5 px-4 pb-[calc(10.5rem+env(safe-area-inset-bottom))] pt-5">
        {query.isError && query.data && <StaleDataNotice onRetry={() => void query.refetch()} />}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="rise-in flex flex-col items-center justify-center py-16 text-center">
            <span className="ibadge tint-indigo mb-4 h-16 w-16">
              <CalendarPlus size={28} strokeWidth={2} />
            </span>
            <p className="text-lg font-semibold">{t("home.empty.title")}</p>
            <p className="mt-1 max-w-56 text-sm text-muted-foreground">{t("home.empty.sub")}</p>
          </div>
        ) : (
          groups.map(([date, items]) => {
            const [y, m, dd] = date.split("-").map(Number);
            const dow = weekdays[new Date(y, m - 1, dd).getDay()];
            const today = toISODate(now) === date;
            return (
              <section key={date} className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
                      today
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground"
                    }`}
                  >
                    <span className="font-display">{dd}</span> {dow}
                    {today && ` · ${t("common.today")}`}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                  <button
                    type="button"
                    aria-label={t("home.addOnDay")}
                    onClick={() => addOnDate(date)}
                    className="press text-muted-foreground active:text-primary"
                  >
                    <CalendarPlus size={18} />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((d, i) => (
                    <DayCard
                      key={`${d.reportId}-${d.id}`}
                      day={d}
                      index={i}
                      onOpen={() => openDay(d)}
                      onStatus={changeStatus}
                      onAddPartial={addPartial}
                      pending={pending}
                      canEdit={selectedWorkerId === "all"}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      <BottomNavigation above={<WorkerChips />} />
    </div>
  );
}
