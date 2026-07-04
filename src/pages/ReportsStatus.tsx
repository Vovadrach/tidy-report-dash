import { useMemo } from "react";
import { Clock, CurrencyEur as Euro } from "@phosphor-icons/react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ClientBalanceCard } from "@/components/ClientBalanceCard";
import { useWorkDays } from "@/data/queries";
import { debtors } from "@/domain/stats";
import { decimalToHours } from "@/domain/time";
import { useWorkerFilter } from "@/contexts/WorkerContext";
import { ScreenSkeleton } from "@/ui/Skeleton";
import { EmptyState } from "@/ui/EmptyState";

const ReportsStatus = () => {
  const { selectedWorkerId } = useWorkerFilter();
  const { data: workDays = [], isLoading, isError, refetch } = useWorkDays();

  const balances = useMemo(
    () => debtors(workDays, selectedWorkerId),
    [workDays, selectedWorkerId],
  );

  const totals = useMemo(
    () =>
      balances.reduce(
        (acc, b) => ({ due: acc.due + b.totalDue, hours: acc.hours + b.unpaidHours }),
        { due: 0, hours: 0 },
      ),
    [balances],
  );

  if (isLoading) {
    return <ScreenSkeleton />;
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground text-lg mb-4">Помилка завантаження даних</p>
          <button onClick={() => refetch()} className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 font-bold">
            Спробувати знову
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-40 app-bar">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="stat-tile stat-tile-time p-4">
              <div className="icon-badge icon-badge-time">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="caption-label mb-1">Години</p>
                <div className="flex items-baseline gap-1">
                  <p className="display text-[1.4rem] text-foreground">{decimalToHours(totals.hours)}</p>
                  <p className="text-sm font-bold text-muted-foreground/70">год</p>
                </div>
              </div>
            </div>

            <div className="stat-tile stat-tile-due p-4">
              <div className="icon-badge icon-badge-due">
                <Euro className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="caption-label mb-1">Сума</p>
                <div className="flex items-baseline gap-1">
                  <p className="display text-[1.4rem] text-foreground">{Math.round(totals.due)}</p>
                  <p className="text-sm font-bold text-muted-foreground/70">€</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="caption-label !text-foreground/70">Очікую оплату</h1>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-40 pb-dock space-y-4">
        {balances.length === 0 ? (
          <EmptyState
            icon={<Euro />}
            title="Немає боргів"
            subtitle="Все оплачено 🎉"
          />
        ) : (
          <div className="space-y-3">
            {balances.map((b) => (
              <ClientBalanceCard key={b.clientId} balance={b} />
            ))}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default ReportsStatus;
