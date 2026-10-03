import { useMemo, useState } from 'react';

import { MoneyNumber } from '@/ui/MoneyNumber';
import { useI18n } from '@/i18n';
import { useWorkerFilter } from '@/contexts/WorkerContext';
import { useWorkDays, useClients } from '@/data/queries';
import { involvesWorker } from '@/domain/money';
import { periodStats, clientBalances } from '@/domain/stats';

import { decimalToHours } from '@/domain/time';

import { useToday } from '@/ui/useToday';
import { QueryError, StaleDataNotice } from '@/ui/QueryError';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Clock, TrendingUp, CircleCheckBig, CircleAlert, Users, ChevronDown, CalendarRange } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
const Tile = ({ tint, icon: Icon, label, children }: { tint: string; icon: typeof Clock; label: string; children: React.ReactNode }) => (
  <div className={`rounded-2xl p-4 ${tint}`}>
    <div className="mb-2.5 flex items-center gap-2">
      <span className="ibadge h-8 w-8 bg-white/70"><Icon size={16} strokeWidth={2.4} /></span>
      <span className="text-[0.7rem] font-bold uppercase tracking-wider opacity-90">{label}</span>
    </div><div className="num-display text-[1.5rem] leading-none text-foreground">{children}</div>
  </div>
);
export default function Dashboard() {
  const { selectedWorkerId } = useWorkerFilter();
  const { t, months } = useI18n();
  const today = useToday();
  const now = useMemo(() => new Date(today + 'T12:00:00'), [today]);
  const [month, setMonth] = useState<number | null>(() => now.getMonth());
  const [year, setYear] = useState<number | null>(() => now.getFullYear());
  const [clientId, setClientId] = useState('all');
  const query = useWorkDays();
  const clientsQuery = useClients();
  const clients = clientsQuery.data ?? [];
  const loading = query.isLoading || clientsQuery.isLoading;
  const periodLabel = year === null ? t('dash.allTime') : month === null ? `${year}` : `${months[month]} ${year}`;
  const clientLabel = clientId === 'all' ? t('dash.allClients') : clients.find(c => c.id === clientId)?.name ?? t('dash.allClients');
  const filtered = useMemo(() => (query.data ?? []).filter(d => !d.isPlanned && involvesWorker(d,selectedWorkerId) &&
    (clientId === 'all' || d.clientId === clientId) && (year === null || d.date.startsWith(month === null ? String(year) : `${year}-${String(month+1).padStart(2,'0')}`))), [query.data,selectedWorkerId,clientId,year,month]);
  const stats = useMemo(() => {
    const value = periodStats(filtered,{ from: '1000-01-01',to: '9999-12-31' },selectedWorkerId);
    return { totalEarned: value.earned,totalPaid: value.paid,totalHours: value.hours,totalRemaining: value.due };
  }, [filtered,selectedWorkerId]);
  const balances = useMemo(() => clientBalances(filtered,selectedWorkerId), [filtered,selectedWorkerId]);
  const leaderboard = useMemo(() => [...balances].sort((a,b) => b.totalEarned-a.totalEarned).slice(0,5).map(b => ({ name: b.clientName,earned: b.totalEarned,hours: b.totalHours })),[balances]);
  const debts = useMemo(() => [...balances].filter(b => b.totalDue > 0).sort((a,b) => b.totalDue-a.totalDue).map(b => ({ name: b.clientName,remaining: b.totalDue })),[balances]);
  const years = useMemo(() => [...new Set([now.getFullYear(), ...(query.data ?? []).map(d => Number(d.date.slice(0,4)))])].sort((a,b) => a-b),[query.data,now]);
  const chip = (active: boolean) => `press flex flex-1 items-center justify-between gap-1.5 rounded-full border px-3.5 py-2.5 text-sm font-semibold ${active ? 'border-primary bg-[hsl(var(--t-indigo-bg))] text-primary' : 'border-border bg-card text-foreground'}`;
  const paidFull = stats.totalRemaining <= 0 && stats.totalEarned > 0;
  if ((query.isError && !query.data) || (clientsQuery.isError && !clientsQuery.data)) return <QueryError onRetry={() => { void query.refetch(); void clientsQuery.refetch(); }} />;
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto max-w-md space-y-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="ibadge tint-indigo h-9 w-9"><TrendingUp size={18} strokeWidth={2.3} /></span>
          <h1 className="text-xl font-bold text-foreground">{t("dash.title")}</h1>
        </div>
        <div className="flex gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={chip(year !== now.getFullYear() || month !== now.getMonth())}>
                <span className="flex items-center gap-1.5 truncate"><CalendarRange size={15} strokeWidth={2.2} /> {periodLabel}</span>
                <ChevronDown size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[70vh] w-56 overflow-y-auto rounded-xl">
              <DropdownMenuItem onClick={() => { setYear(null); setMonth(null); }} className="font-semibold">
                {t("dash.allTime")}
              </DropdownMenuItem>
              <div className="flex gap-1 px-2 py-1.5">
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => { setYear(y); setMonth(null); }}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${year === y ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              {months.map((m, i) => (
                <DropdownMenuItem
                  key={i}
                  onClick={() => { setMonth(i); if (year === null) setYear(now.getFullYear()); }}
                  className={month === i ? "font-bold text-primary" : ""}
                >
                  {m}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={chip(clientId !== "all")}>
                <span className="truncate">{clientLabel}</span>
                <ChevronDown size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[70vh] w-56 overflow-y-auto rounded-xl">
              <DropdownMenuItem onClick={() => setClientId("all")} className="font-semibold">{t("dash.allClients")}</DropdownMenuItem>
              {clients.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => setClientId(c.id)} className={clientId === c.id ? "font-bold text-primary" : ""}>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4">
        {(query.isError || clientsQuery.isError) && <StaleDataNotice onRetry={() => { void query.refetch(); void clientsQuery.refetch(); }} />}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Tile tint="tint-indigo" icon={TrendingUp} label={t("common.earned")}><MoneyNumber value={stats.totalEarned} />€</Tile>
              <Tile tint="tint-violet" icon={Clock} label={t("common.hours")}>{decimalToHours(stats.totalHours)}</Tile>
              <Tile tint={paidFull ? "tint-emerald" : "tint-sky"} icon={CircleCheckBig} label={t("common.paid")}><MoneyNumber value={stats.totalPaid} />€</Tile>
              <Tile tint="tint-rose" icon={CircleAlert} label={t("common.due")}><MoneyNumber value={stats.totalRemaining} />€</Tile>
            </div>

            {clientId === "all" && debts.length > 0 && (
              <section className="card-flat rounded-2xl p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="ibadge tint-rose h-8 w-8"><CircleAlert size={16} strokeWidth={2.3} /></span>
                  <h2 className="font-semibold text-foreground">{t("dash.debtsByClient")}</h2>
                </div>
                <div className="space-y-1.5">
                  {debts.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5">
                      <span className="text-sm font-semibold text-foreground">{d.name}</span>
                      <span className="num-display text-sm text-[hsl(var(--t-rose-fg))]">{d.remaining}€</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {clientId === "all" && leaderboard.length > 0 && (
              <section className="card-flat rounded-2xl p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="ibadge tint-indigo h-8 w-8"><Users size={16} strokeWidth={2.3} /></span>
                  <h2 className="font-semibold text-foreground">{t("dash.topClients")}</h2>
                </div>
                <div className="space-y-1.5">
                  {leaderboard.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3.5 py-2.5">
                      <span className="ibadge tint-indigo h-7 w-7 font-display text-xs font-bold">{i + 1}</span>
                      <span className="flex-1 truncate text-sm font-semibold text-foreground">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{decimalToHours(c.hours)} {t("common.hoursShort")}</span>
                      <span className="num-display w-16 text-right text-sm text-foreground">{c.earned}€</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">{t("dash.noData")}</div>
            )}
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
