import { useMemo } from 'react';
import { ChevronRight, HandCoins, PartyPopper } from 'lucide-react';
import { MoneyNumber } from '@/ui/MoneyNumber';
import { useI18n } from '@/i18n';
import { useWorkerFilter } from '@/contexts/WorkerContext';
import { useWorkDays } from '@/data/queries';
import { debtors as findDebtors } from '@/domain/stats';
import { decimalToHours } from '@/domain/time';
import { StaleDataNotice } from '@/ui/QueryError';
import { useGo } from '@/ui/nav';
import { Column, EmptyState, IconFrame, LargeTitle, Screen, SectionLabel } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { ClientAvatar } from '@/ui/Avatar';
import { stagger } from '@/ui/motion';
import { BottomNavigation } from '@/components/BottomNavigation';

/**
 * «Очікую» — кому нагадати про оплату. Зверху загальний борг великою цифрою,
 * нижче — боржники від найбільшого. Тап по рядку — борги клієнта.
 */
export default function ReportsStatus() {
  const go = useGo();
  const { selectedWorkerId } = useWorkerFilter();
  const { t } = useI18n();
  const query = useWorkDays();
  const loading = query.isLoading;
  const error = query.isError && !query.data ? t('waiting.loadError') : null;
  const loadData = () => { void query.refetch(); };
  const debtors = useMemo(() => findDebtors(query.data ?? [], selectedWorkerId).map(b => ({ clientId: b.clientId, name: b.clientName, hours: b.unpaidHours, remaining: b.totalDue })), [query.data, selectedWorkerId]);
  const totalDue = debtors.reduce((n, d) => n + d.remaining, 0);
  const totalHours = debtors.reduce((n, d) => n + d.hours, 0);
  return (
    <Screen>
      <Column className="space-y-5 pb-[calc(9rem+env(safe-area-inset-bottom))]">
        <LargeTitle title={t('waiting.title')} />
        {query.isError && query.data && <StaleDataNotice onRetry={loadData} />}
        {loading ? (
          <>
            <div className="skeleton h-36 rounded-[20px]" />
            <div className="skeleton h-40 rounded-[20px]" />
          </>
        ) : error ? (
          <EmptyState tone="alert" icon={<HandCoins size={26} strokeWidth={2} />} title={error}
            action={<Button variant="primary" size="lg" onClick={loadData}>{t('waiting.tryAgain')}</Button>} />
        ) : debtors.length === 0 ? (
          <EmptyState tone="ok" icon={<PartyPopper size={26} strokeWidth={2} />} title={t('waiting.allPaid')} subtitle={t('waiting.noDebts')} />
        ) : (
          <>
            <div className="card rise-in p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <IconFrame tone="alert" size="sm"><HandCoins size={15} strokeWidth={2.3} /></IconFrame>
                <span className="text-footnote font-semibold text-ink-3">{t('waiting.owed')}</span>
              </div>
              <p className="num text-[2.75rem] font-bold leading-none tracking-[-0.03em] text-ink">
                <MoneyNumber value={totalDue} /><span className="ml-1.5 text-title font-semibold text-ink-3">€</span>
              </p>
              <p className="mt-2 text-callout text-ink-3">{t('waiting.forHours', { h: decimalToHours(totalHours) })}</p>
            </div>

            <div className="space-y-2">
              <SectionLabel>{t('dash.debtsByClient')}</SectionLabel>
              <div className="card list overflow-hidden [--list-inset:4rem]">
                {debtors.map((d, i) => (
                  <button key={d.clientId} type="button" onClick={() => go(`/client-reports/${d.clientId}`)} style={stagger(i)}
                    className="tap rise-in flex w-full items-center gap-3 px-4 py-3 text-left">
                    <ClientAvatar name={d.name} id={d.clientId} transitionName={`avatar-${d.clientId}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-headline text-ink">{d.name}</span>
                      <span className="block num text-footnote text-ink-3">{decimalToHours(d.hours)} {t('common.hoursShort')}</span>
                    </span>
                    <span className="num shrink-0 rounded-full bg-alert-tint px-2.5 py-1 text-callout font-semibold text-alert-ink">
                      <MoneyNumber value={d.remaining} /> €
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-ink-4" />
                  </button>
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
