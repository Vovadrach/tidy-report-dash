import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { MoneyNumber } from '@/ui/MoneyNumber';
import { useI18n } from '@/i18n';
import { useWorkerFilter } from '@/contexts/WorkerContext';
import { useWorkDays } from '@/data/queries';
import { round2 } from '@/domain/money';
import { debtors as findDebtors } from '@/domain/stats';

import { decimalToHours } from '@/domain/time';

import { StaleDataNotice } from '@/ui/QueryError';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Clock, ChevronRight, PartyPopper, HandCoins } from 'lucide-react';
export default function ReportsStatus() {
  const navigate = useNavigate();
  const { selectedWorkerId } = useWorkerFilter();
  const { t } = useI18n();
  const query = useWorkDays();
  const loading = query.isLoading;
  const error = query.isError && !query.data ? t('waiting.loadError') : null;
  const loadData = () => { void query.refetch(); };
  const debtors = useMemo(() => findDebtors(query.data ?? [],selectedWorkerId).map(b => ({ clientId: b.clientId,name: b.clientName,hours: b.unpaidHours,remaining: b.totalDue })), [query.data,selectedWorkerId]);
  const totalDue = round2(debtors.reduce((n,d) => n + d.remaining,0));
  const totalHours = debtors.reduce((n,d) => n + d.hours,0);
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto max-w-md px-4 pt-4">
        <div className="flex items-center gap-2 pb-1">
          <span className="ibadge tint-amber h-9 w-9"><HandCoins size={18} strokeWidth={2.3} /></span>
          <h1 className="text-xl font-bold text-foreground">{t("waiting.title")}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4">
        {query.isError && query.data && <StaleDataNotice onRetry={loadData} />}
        {loading ? (
          <>
            <div className="skeleton h-28 rounded-2xl" />
            <div className="skeleton h-16 rounded-2xl" />
            <div className="skeleton h-16 rounded-2xl" />
          </>
        ) : error ? (
          <div className="card-flat rounded-2xl p-5 text-center">
            <p className="mb-3 text-muted-foreground">{error}</p>
            <button onClick={loadData} className="press rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
              {t("waiting.tryAgain")}
            </button>
          </div>
        ) : debtors.length === 0 ? (
          <div className="rise-in flex flex-col items-center justify-center py-20 text-center">
            <span className="ibadge tint-emerald mb-4 h-16 w-16"><PartyPopper size={28} strokeWidth={2} /></span>
            <p className="text-lg font-semibold">{t("waiting.allPaid")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("waiting.noDebts")}</p>
          </div>
        ) : (
          <>
            <div className="rise-in tint-rose rounded-2xl p-5 text-center">
              <p className="text-[0.72rem] font-bold uppercase tracking-wider opacity-80">{t("waiting.owed")}</p>
              <p className="num-display mt-1 text-4xl text-foreground"><MoneyNumber value={totalDue} />€</p>
              <p className="mt-1 text-sm font-medium opacity-80">{t("waiting.forHours", { h: decimalToHours(totalHours) })}</p>
            </div>

            <div className="space-y-2.5">
              {debtors.map((d, i) => (
                <button
                  key={d.clientId}
                  type="button"
                  onClick={() => navigate(`/client-reports/${d.clientId}`, { viewTransition: true })}
                  style={{ animationDelay: `${Math.min(i * 0.04, 0.25)}s` }}
                  className="press rise-in card-flat flex w-full items-center gap-3 rounded-2xl p-3.5 text-left"
                >
                  <span
                    className="ibadge tint-indigo h-11 w-11 font-display text-base font-semibold"
                    style={{ viewTransitionName: `avatar-${d.clientId}` }}
                  >
                    {d.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{d.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={12} strokeWidth={2.3} /> {decimalToHours(d.hours)} {t("common.hoursShort")}
                    </p>
                  </div>
                  <span className="tint-rose num-display rounded-xl px-3 py-1.5 text-sm">
                    <MoneyNumber value={d.remaining} />€
                  </span>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
