import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, CurrencyEur as Euro, CheckCircle as CheckCircle2, XCircle, WarningCircle as AlertCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMarkAllPaid, useSetPayment, useWorkDays } from "@/data/queries";
import { useWorkerFilter } from "@/contexts/WorkerContext";
import { decimalToHours } from "@/domain/time";
import { applyPartialPayment, involvesWorker, workerView } from "@/domain/money";
import { formatFullDate } from "@/domain/dates";
import type { PaymentStatus, WorkDay } from "@/domain/types";
import { ScreenSkeleton } from "@/ui/Skeleton";

const ClientReports = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { selectedWorkerId } = useWorkerFilter();
  const { data: workDays = [], isLoading } = useWorkDays();
  const setPayment = useSetPayment();
  const markAllPaid = useMarkAllPaid();
  const [partialDayId, setPartialDayId] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState("");

  const unpaidDays = useMemo(
    () =>
      workDays.filter((day) => {
        if (day.clientId !== clientId || day.isPlanned) return false;
        if (!involvesWorker(day, selectedWorkerId)) return false;
        return workerView(day, selectedWorkerId).due > 0.005;
      }),
    [workDays, clientId, selectedWorkerId],
  );

  const clientName = useMemo(
    () => workDays.find((d) => d.clientId === clientId)?.clientName ?? "Клієнт",
    [workDays, clientId],
  );

  const totals = useMemo(() => {
    let due = 0;
    let minutes = 0;
    for (const day of unpaidDays) {
      const v = workerView(day, selectedWorkerId);
      due += v.due;
      if (v.amount > 0) minutes += Math.round(v.hours * (v.due / v.amount) * 60);
    }
    return { due, hours: minutes / 60 };
  }, [unpaidDays, selectedWorkerId]);

  const handleStatusChange = (day: WorkDay, status: PaymentStatus) => {
    if (status === "partial") {
      setPartialDayId(day.id);
      setPartialAmount("");
      return;
    }
    setPartialDayId(null);
    setPayment.mutate({
      dayId: day.id,
      status,
      paidAmount: status === "paid" ? day.amount : 0,
    });
  };

  const handleApplyPartial = (day: WorkDay) => {
    const result = applyPartialPayment(day, parseFloat(partialAmount));
    if (!result.ok) {
      toast.error(result.error === "exceeds" ? "Сума перевищує залишок" : "Введіть коректну суму");
      return;
    }
    setPayment.mutate({ dayId: day.id, status: result.status, paidAmount: result.paidAmount });
    setPartialDayId(null);
    setPartialAmount("");
  };

  if (isLoading) {
    return <ScreenSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-40 app-bar">
        <div className="container mx-auto px-4 py-4">
          <h1 className="display text-xl text-center text-foreground">{clientName}</h1>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-20 pb-dock max-w-4xl space-y-3">
        {unpaidDays.length > 0 && (
          <div className="surface-card p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="chip chip-due p-3 text-lg rounded-xl">
                <AlertCircle className="w-5 h-5" />
                <span>{Math.round(totals.due)}€</span>
              </div>
              <div className="chip chip-time p-3 text-lg rounded-xl">
                <Clock className="w-5 h-5" />
                <span>{decimalToHours(totals.hours)}</span>
              </div>
            </div>

            <button
              onClick={() => markAllPaid.mutate(unpaidDays.map((d) => ({ id: d.id, amount: d.amount })))}
              disabled={markAllPaid.isPending}
              className="w-full bg-success hover:bg-success/90 text-success-foreground font-bold shadow-sm rounded-full h-10 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              Оплачено всі ({unpaidDays.length})
            </button>
          </div>
        )}

        {unpaidDays.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-center text-muted-foreground">Всі робочі дні оплачені</p>
          </div>
        ) : (
          unpaidDays.map((day) => {
            const v = workerView(day, selectedWorkerId);
            return (
              <div key={day.id}>
                <div
                  onClick={() => navigate(`/day/${day.id}`, { viewTransition: true })}
                  className="surface-card surface-card-hover p-3 sm:p-4 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 transition-all ${
                            day.status === 'paid' ? 'bg-success/20' :
                            day.status === 'partial' ? 'bg-warning/20' : 'bg-destructive/20'
                          }`}>
                            <span className={`text-sm sm:text-base ${
                              day.status === 'paid' ? 'text-success' :
                              day.status === 'partial' ? 'text-warning' : 'text-destructive'
                            }`}>
                              {day.status === 'paid' ? '●' : day.status === 'partial' ? '◐' : '○'}
                            </span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="z-[100] rounded-xl p-1.5 min-w-[150px] shadow-lg">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(day, "paid"); }} className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-success/10">
                            <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                            Оплачено
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(day, "partial"); }} className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-warning/10">
                            <AlertCircle className="w-4 h-4 mr-2 inline" />
                            Частково
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(day, "unpaid"); }} className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-destructive/10">
                            <XCircle className="w-4 h-4 mr-2 inline" />
                            Не оплачено
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs sm:text-sm font-semibold truncate text-foreground">
                          {formatFullDate(day.date)}
                        </h3>
                        {day.note && (
                          <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">📝 {day.note}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <div className="chip chip-time min-w-[58px]">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{decimalToHours(v.hours)}</span>
                      </div>
                      <div className="chip chip-money min-w-[58px]">
                        <Euro className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{Math.round(v.amount)}</span>
                      </div>
                      {v.due > 0.005 && (
                        <div className={`chip min-w-[58px] ${day.status === 'partial' ? 'chip-due' : 'chip-alert'}`}>
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{Math.round(v.due)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {partialDayId === day.id && (
                  <div className="mt-2 surface-card p-3 border-warning/40" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 items-start">
                      <Input
                        type="number"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        placeholder={`Залишок: ${Math.round(workerView(day, "all").due)}€`}
                        className="h-9 text-sm rounded-lg flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => handleApplyPartial(day)}
                        className="h-9 px-4 rounded-full text-sm font-bold bg-warning hover:bg-warning/90 text-warning-foreground transition-colors active:scale-95"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => { setPartialDayId(null); setPartialAmount(""); }}
                        className="h-9 px-4 rounded-full text-sm font-bold bg-secondary hover:bg-muted text-secondary-foreground transition-colors active:scale-95"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default ClientReports;
