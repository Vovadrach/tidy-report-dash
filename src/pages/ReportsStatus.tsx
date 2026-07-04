import { useMemo } from "react";
import { CurrencyEur as Euro } from "@phosphor-icons/react";
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
          <h1 className="display text-[1.6rem] text-foreground leading-tight">Очікую оплату</h1>
          <div className="flex items-end justify-between mt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="display text-[2.1rem] leading-none text-foreground">{Math.round(totals.due)}</span>
              <span className="text-base font-bold text-muted-foreground">€</span>
            </div>
            <div className="text-right">
              <span className="display text-lg text-foreground">{decimalToHours(totals.hours)}</span>
              <span className="text-xs font-semibold text-muted-foreground ml-1">год</span>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-5 pt-32 pb-dock space-y-4">
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
