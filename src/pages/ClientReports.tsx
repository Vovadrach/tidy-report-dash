import { useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { MoneyNumber } from '@/ui/MoneyNumber';
import { useI18n } from '@/i18n';
import { useWorkerFilter } from '@/contexts/WorkerContext';
import { useWorkDays, useClients, useSetPayment, useMarkAllPaid } from '@/data/queries';
import { workerView, involvesWorker, round2 } from '@/domain/money';

import { decimalToHours } from '@/domain/time';
import type { WorkDay, PaymentStatus } from '@/domain/types';

import { QueryError, StaleDataNotice } from '@/ui/QueryError';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Clock, ArrowLeft, CircleCheck, CircleDashed, Circle, CheckCheck, StickyNote } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
const STATUS_META = { paid: { icon: CircleCheck,tint: 'tint-emerald' },partial: { icon: CircleDashed,tint: 'tint-amber' },unpaid: { icon: Circle,tint: 'tint-rose' } };
export default function ClientReports() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { selectedWorkerId } = useWorkerFilter();
  const { t, locale } = useI18n();
  const query = useWorkDays();
  const clientsQuery = useClients();
  const client = clientsQuery.data?.find(c => c.id === clientId);
  const loading = query.isLoading || clientsQuery.isLoading;
  const setPayment = useSetPayment();
  const bulk = useMarkAllPaid();
  const busy = useRef(false);
  const pending = setPayment.isPending || bulk.isPending;
  const days = useMemo(() => (query.data ?? []).filter(d => d.clientId === clientId && !d.isPlanned && involvesWorker(d,selectedWorkerId) && workerView(d,selectedWorkerId).due > 0).sort((a,b) => b.date.localeCompare(a.date)), [query.data,clientId,selectedWorkerId]);
  const remainingOf = (day: WorkDay) => workerView(day,selectedWorkerId).due;
  const totalDue = round2(days.reduce((n,d) => n+remainingOf(d),0));
  const totalHours = days.reduce((n,d) => { const v=workerView(d,selectedWorkerId); return n+(v.amount > 0 ? v.hours*v.due/v.amount : 0); },0);
  const changeStatus = async (dayId: string,status: PaymentStatus,paidAmount: number) => {
    if (busy.current || pending || selectedWorkerId !== 'all') return;
    busy.current=true;
    try { await setPayment.mutateAsync({ dayId,status,paidAmount }); } catch { /* mutation reports error */ } finally { busy.current=false; }
  };
  const markAllPaid = async () => {
    if (busy.current || pending || selectedWorkerId !== 'all' || !days.length) return;
    busy.current=true;
    try { await bulk.mutateAsync(days); } catch { /* mutation reports error */ } finally { busy.current=false; }
  };
  if ((query.isError && !query.data) || (clientsQuery.isError && !clientsQuery.data)) return <QueryError onRetry={() => { void query.refetch(); void clientsQuery.refetch(); }} />;
  if (!loading && !client) return <QueryError message={t('client.notFound')} onRetry={() => navigate('/reports-status')} />;
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-md items-center gap-3 px-4 pt-3">
        <button
          type="button"
          aria-label={t("common.back")}
          onClick={() => navigate("/reports-status", { viewTransition: true })}
          className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
        >
          <ArrowLeft size={20} strokeWidth={2.3} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className="ibadge tint-indigo h-10 w-10 font-display text-base font-semibold"
            style={{ viewTransitionName: `avatar-${clientId}` }}
          >
            {(client?.name || "?").charAt(0).toUpperCase()}
          </span>
          <h1 className="truncate text-lg font-bold text-foreground">{client?.name || t("client.notFound")}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4">
        {(query.isError || clientsQuery.isError) && <StaleDataNotice onRetry={() => { void query.refetch(); void clientsQuery.refetch(); }} />}
        {loading ? (
          <>
            <div className="skeleton h-32 rounded-2xl" />
            <div className="skeleton h-16 rounded-2xl" />
          </>
        ) : !days || days.length === 0 ? (
          <div className="rise-in flex flex-col items-center justify-center py-20 text-center">
            <span className="ibadge tint-emerald mb-4 h-16 w-16"><CircleCheck size={28} strokeWidth={2} /></span>
            <p className="text-lg font-semibold">{t("client.allPaid")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("client.noDebts")}</p>
          </div>
        ) : (
          <>
            <div className="card-flat space-y-3 rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="tint-rose rounded-xl p-3.5 text-center">
                  <p className="text-[0.7rem] font-bold uppercase tracking-wider opacity-80">{t("client.debt")}</p>
                  <p className="num-display mt-0.5 text-2xl text-foreground"><MoneyNumber value={totalDue} />€</p>
                </div>
                <div className="tint-violet rounded-xl p-3.5 text-center">
                  <p className="text-[0.7rem] font-bold uppercase tracking-wider opacity-80">{t("common.hours")}</p>
                  <p className="num-display mt-0.5 text-2xl text-foreground">{decimalToHours(totalHours)}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={pending || selectedWorkerId !== "all"} onClick={markAllPaid}
                className="press disabled:opacity-50 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--success))] py-3 text-sm font-bold text-white"
              >
                <CheckCheck size={18} strokeWidth={2.5} /> {t("client.markAllPaid", { n: days.length })}
              </button>
            </div>

            <div className="space-y-2.5">
              {days.map((day, i) => {
                const status = day.status;
                const wd = workerView(day, selectedWorkerId);
                const meta = STATUS_META[status];
                const Icon = meta.icon;
                const rem = remainingOf(day);
                return (
                  <div
                    key={`${day.reportId}-${day.id}`}
                    style={{ animationDelay: `${Math.min(i * 0.035, 0.22)}s` }}
                    className="card-flat rise-in flex items-center gap-3 rounded-2xl p-3.5"
                  >
                    {selectedWorkerId === "all" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button disabled={pending} className={`ibadge press h-9 w-9 ${meta.tint}`} aria-label={t("common.status")}>
                            <Icon size={18} strokeWidth={2.4} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-xl">
                          <DropdownMenuItem onClick={() => changeStatus(day.id, "paid", day.amount)}>
                            <CircleCheck size={16} className="text-success" /> {t("status.paid")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changeStatus(day.id, "unpaid", 0)}>
                            <Circle size={16} className="text-destructive" /> {t("status.unpaid")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className={`ibadge h-9 w-9 ${meta.tint}`}><Icon size={18} strokeWidth={2.4} /></span>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate(`/day/${day.id}`, { viewTransition: true })}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="font-semibold text-foreground">
                        {new Date(day.date + "T00:00:00").toLocaleDateString(locale)}
                      </p>
                      {day.note && (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <StickyNote size={11} /> {day.note}
                        </p>
                      )}
                    </button>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="tint-violet inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold">
                        <Clock size={13} strokeWidth={2.4} />{decimalToHours(wd.hours)}
                      </span>
                      <span className="tint-rose num-display rounded-lg px-2.5 py-1.5 text-sm">{rem}€</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
