import { useMemo, useState, type ReactNode } from 'react';
import { CalendarRange, Check, ChevronDown, CircleAlert, CircleCheckBig, Clock, Search, SlidersHorizontal, TrendingUp, Users } from 'lucide-react';
import { MoneyNumber } from '@/ui/MoneyNumber';
import { useI18n } from '@/i18n';
import { useWorkerFilter } from '@/contexts/WorkerContext';
import { useWorkDays, useClients } from '@/data/queries';
import { involvesWorker } from '@/domain/money';
import { periodStats, clientBalances } from '@/domain/stats';
import { decimalToHours } from '@/domain/time';
import { cn } from '@/lib/utils';
import { useToday } from '@/ui/useToday';
import { QueryError, StaleDataNotice } from '@/ui/QueryError';
import { Column, EmptyState, IconFrame, LargeTitle, Screen, SectionLabel } from '@/ui/Screen';
import { IconButton, type Tone } from '@/ui/Button';
import { ClientAvatar } from '@/ui/Avatar';
import { MonthSheet, type MonthPick } from '@/ui/MonthSheet';
import { Sheet } from '@/ui/Sheet';
import { TextInput } from '@/ui/Field';
import { PaymentBar } from '@/ui/Payment';
import { stagger } from '@/ui/motion';
import { BottomNavigation } from '@/components/BottomNavigation';
import { SettingsSheet } from '@/components/SettingsSheet';

const Metric = ({ tone, icon, label, children, className }: { tone?: Tone | 'neutral'; icon: ReactNode; label: string; children: ReactNode; className?: string }) => (
  <div className={cn('card p-4', className)}>
    <div className="mb-2.5 flex items-center gap-2">
      <IconFrame tone={tone} size="sm">{icon}</IconFrame>
      <span className="truncate text-footnote font-semibold text-ink-3">{label}</span>
    </div>
    <div className="num text-[1.625rem] font-bold leading-8 tracking-[-0.02em] text-ink">{children}</div>
  </div>
);

/** Кнопка-фільтр: тонова, коли фільтр відхиляється від типового. */
const FilterChip = ({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) => (
  <button type="button" onClick={onClick}
    className={cn('press tap flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[14px] px-3.5 text-callout font-semibold',
      active ? 'bg-accent-tint text-accent-ink' : 'bg-surface text-ink shadow-card')}>
    <span className="shrink-0 opacity-80">{icon}</span>
    <span className="min-w-0 flex-1 truncate text-left">{label}</span>
    <ChevronDown size={17} strokeWidth={2.4} className="shrink-0 opacity-60" />
  </button>
);

/**
 * Звіт — підсумки за обраний період і клієнта. Фільтри відкривають листи
 * (місяць/рік/весь час; клієнт з пошуком). Показники — плитки, далі смуга
 * оплати, борги й найкращі клієнти.
 */
export default function Dashboard() {
  const { selectedWorkerId } = useWorkerFilter();
  const { t, months } = useI18n();
  const today = useToday();
  const now = useMemo(() => new Date(today + 'T12:00:00'), [today]);
  const [month, setMonth] = useState<number | null>(() => now.getMonth());
  const [year, setYear] = useState<number | null>(() => now.getFullYear());
  const [clientId, setClientId] = useState('all');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const query = useWorkDays();
  const clientsQuery = useClients();
  const clients = clientsQuery.data ?? [];
  const loading = query.isLoading || clientsQuery.isLoading;
  const periodLabel = year === null ? t('dash.allTime') : month === null ? `${t('month.wholeYear')} ${year}` : year === now.getFullYear() ? months[month] : `${months[month]} ${year}`;
  const clientLabel = clientId === 'all' ? t('dash.allClients') : clients.find(c => c.id === clientId)?.name ?? t('dash.allClients');
  const filtered = useMemo(() => (query.data ?? []).filter(d => !d.isPlanned && involvesWorker(d, selectedWorkerId) &&
    (clientId === 'all' || d.clientId === clientId) && (year === null || d.date.startsWith(month === null ? String(year) : `${year}-${String(month + 1).padStart(2, '0')}`))), [query.data, selectedWorkerId, clientId, year, month]);
  const stats = useMemo(() => {
    const value = periodStats(filtered, { from: '1000-01-01', to: '9999-12-31' }, selectedWorkerId);
    return { totalEarned: value.earned, totalPaid: value.paid, totalHours: value.hours, totalRemaining: value.due };
  }, [filtered, selectedWorkerId]);
  const balances = useMemo(() => clientBalances(filtered, selectedWorkerId), [filtered, selectedWorkerId]);
  const leaderboard = useMemo(() => [...balances].sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 5).map(b => ({ id: b.clientId, name: b.clientName, earned: b.totalEarned, hours: b.totalHours })), [balances]);
  const debts = useMemo(() => [...balances].filter(b => b.totalDue > 0).sort((a, b) => b.totalDue - a.totalDue).map(b => ({ id: b.clientId, name: b.clientName, remaining: b.totalDue })), [balances]);
  const topEarned = leaderboard[0]?.earned ?? 0;
  const periodValue: MonthPick = year === null ? null : { year, month };
  const paidFull = stats.totalRemaining <= 0 && stats.totalEarned > 0;
  const visibleClients = clients.filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase()));
  if ((query.isError && !query.data) || (clientsQuery.isError && !clientsQuery.data)) return <QueryError onRetry={() => { void query.refetch(); void clientsQuery.refetch(); }} />;

  return (
    <Screen>
      <Column className="space-y-4 pb-[calc(9rem+env(safe-area-inset-bottom))]">
        <LargeTitle title={t('dash.title')}
          actions={<IconButton label={t('settings.title')} variant="surface" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={18} strokeWidth={2.1} /></IconButton>} />
        <div className="flex gap-2.5">
          <FilterChip active={year !== now.getFullYear() || month !== now.getMonth()} icon={<CalendarRange size={17} strokeWidth={2.2} />} label={periodLabel} onClick={() => setPeriodOpen(true)} />
          <FilterChip active={clientId !== 'all'} icon={<Users size={17} strokeWidth={2.2} />} label={clientLabel} onClick={() => { setSearch(''); setClientOpen(true); }} />
        </div>

        {(query.isError || clientsQuery.isError) && <StaleDataNotice onRetry={() => { void query.refetch(); void clientsQuery.refetch(); }} />}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[6.5rem] rounded-[20px]" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState tone="neutral" icon={<CalendarRange size={26} strokeWidth={2} />} title={t('dash.noData')} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Metric className="rise-in" icon={<TrendingUp size={15} strokeWidth={2.3} />} label={t('common.earned')}><MoneyNumber value={stats.totalEarned} /> €</Metric>
              <Metric className="rise-in" icon={<Clock size={15} strokeWidth={2.3} />} label={t('common.hours')}>{decimalToHours(stats.totalHours) || '0'}</Metric>
              <Metric className="rise-in" tone="ok" icon={<CircleCheckBig size={15} strokeWidth={2.3} />} label={t('common.paid')}><MoneyNumber value={stats.totalPaid} /> €</Metric>
              <Metric className="rise-in" tone={paidFull ? 'ok' : 'alert'} icon={<CircleAlert size={15} strokeWidth={2.3} />} label={t('common.due')}><MoneyNumber value={stats.totalRemaining} /> €</Metric>
            </div>
            {stats.totalEarned > 0 && (
              <div className="card rise-in px-4 py-3.5">
                <div className="mb-2 flex justify-between text-footnote font-semibold">
                  <span className="text-ink-2">{t('pay.progress', { paid: Math.round(stats.totalPaid), total: Math.round(stats.totalEarned) })}</span>
                  <span className="num text-ok-ink">{Math.round((stats.totalPaid / stats.totalEarned) * 100)}%</span>
                </div>
                <PaymentBar amount={stats.totalEarned} paid={stats.totalPaid} />
              </div>
            )}

            {clientId === 'all' && debts.length > 0 && (
              <section className="space-y-2">
                <SectionLabel>{t('dash.debtsByClient')}</SectionLabel>
                <div className="card list overflow-hidden [--list-inset:4rem]">
                  {debts.map((d, i) => (
                    <div key={d.id} className="rise-in flex items-center gap-3 px-4 py-3" style={stagger(i)}>
                      <ClientAvatar name={d.name} id={d.id} size="md" />
                      <span className="min-w-0 flex-1 truncate text-headline text-ink">{d.name}</span>
                      <span className="num shrink-0 text-headline text-alert-ink">{d.remaining} €</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {clientId === 'all' && leaderboard.length > 0 && (
              <section className="space-y-2">
                <SectionLabel>{t('dash.topClients')}</SectionLabel>
                <div className="card list overflow-hidden [--list-inset:4rem]">
                  {leaderboard.map((c, i) => (
                    <div key={c.id} className="rise-in flex items-center gap-3 px-4 py-3" style={stagger(i)}>
                      <ClientAvatar name={c.name} id={c.id} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 truncate text-headline text-ink">{c.name}</span>
                          <span className="num shrink-0 text-headline text-ink">{c.earned} €</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2.5">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-well">
                            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${topEarned ? (c.earned / topEarned) * 100 : 0}%` }} />
                          </div>
                          <span className="num w-14 shrink-0 text-right text-footnote text-ink-3">{decimalToHours(c.hours)} {t('common.hoursShort')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </Column>

      <MonthSheet open={periodOpen} onOpenChange={setPeriodOpen} now={now} value={periodValue} allowYear allowAll title={t('report.period')}
        onPick={(pick) => { if (pick === null) { setYear(null); setMonth(null); } else { setYear(pick.year); setMonth(pick.month); } }} />

      <Sheet open={clientOpen} onOpenChange={setClientOpen} title={t('report.client')}>
        {clients.length > 6 && (
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('select.search')} aria-label={t('select.search')}
            icon={<Search size={18} strokeWidth={2.2} />} wrapClassName="mb-3" />
        )}
        <div className="list [--list-inset:3.5rem]">
          {[{ id: 'all', name: t('dash.allClients') }, ...visibleClients].map((c) => {
            const active = clientId === c.id;
            return (
              <button key={c.id} type="button" onClick={() => { setClientId(c.id); setClientOpen(false); }} aria-pressed={active}
                className="tap flex min-h-14 w-full items-center gap-3 rounded-[14px] py-2 text-left">
                {c.id === 'all'
                  ? <IconFrame tone="accent" className="h-10 w-10 rounded-full"><Users size={18} strokeWidth={2.2} /></IconFrame>
                  : <ClientAvatar name={c.name} id={c.id} />}
                <span className="min-w-0 flex-1 truncate text-headline text-ink">{c.name}</span>
                {active && <Check size={20} strokeWidth={2.6} className="text-accent" />}
              </button>
            );
          })}
        </div>
      </Sheet>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <BottomNavigation />
    </Screen>
  );
}
