import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Report, Client } from "@/types/report";
import { Clock, ChevronRight, PartyPopper, HandCoins } from "lucide-react";
import { toast } from "sonner";
import NumberFlow from "@number-flow/react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { decimalToHours } from "@/utils/timeFormat";
import { useWorker } from "@/contexts/WorkerContext";

export default function ReportsStatus() {
  const navigate = useNavigate();
  const { selectedWorkerId } = useWorker();
  const [reports, setReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reportsData, clientsData] = await Promise.all([api.getReports(), api.getClients()]);
      const recalculated = reportsData.map((report) => {
        let totalHours = 0, totalEarned = 0, paidAmount = 0;
        (report.workDays || []).forEach((day) => {
          if (day.is_planned) return;
          const dayStatus = day.paymentStatus || day.payment_status;
          const dayPaid = day.day_paid_amount || 0;
          if (selectedWorkerId !== "all") {
            const a = day.assignments?.find((x) => x.worker_id === selectedWorkerId || x.workerId === selectedWorkerId);
            if (!a) return;
            const wA = a.amount || 0, wH = a.hours || 0;
            totalHours += wH; totalEarned += wA;
            if (dayStatus === "paid") paidAmount += wA;
            else if (dayStatus === "partial") paidAmount += day.amount > 0 ? (wA / day.amount) * dayPaid : 0;
          } else {
            totalHours += day.hours || 0; totalEarned += day.amount || 0;
            if (dayStatus === "paid") paidAmount += day.amount || 0;
            else if (dayStatus === "partial") paidAmount += dayPaid;
          }
        });
        const remainingAmount = totalEarned - paidAmount;
        const paymentStatus = paidAmount >= totalEarned && totalEarned > 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";
        return { ...report, totalHours, totalEarned, paidAmount, remainingAmount, paymentStatus };
      });
      setReports(recalculated);
      setClients(clientsData);
    } catch (e) {
      setError("Помилка завантаження");
      toast.error("Помилка завантаження");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const debtors = useMemo(() => {
    const unpaid = reports.filter((r) => (r.paymentStatus === "unpaid" || r.paymentStatus === "partial") && r.remainingAmount > 0);
    const byClient = new Map<string, { clientId: string; name: string; hours: number; remaining: number }>();
    for (const r of unpaid) {
      const cid = r.clientId || r.client_id || "";
      const e = byClient.get(cid) || { clientId: cid, name: r.clientName || r.client_name || "Без імені", hours: 0, remaining: 0 };
      e.hours += r.totalHours || 0;
      e.remaining += r.remainingAmount || 0;
      byClient.set(cid, e);
    }
    return [...byClient.values()].filter((d) => d.remaining > 0.5).sort((a, b) => b.remaining - a.remaining);
  }, [reports]);

  const totalDue = debtors.reduce((s, d) => s + d.remaining, 0);
  const totalHours = debtors.reduce((s, d) => s + d.hours, 0);

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto max-w-md px-4 pt-4">
        <div className="flex items-center gap-2 pb-1">
          <span className="ibadge tint-amber h-9 w-9"><HandCoins size={18} strokeWidth={2.3} /></span>
          <h1 className="text-xl font-bold text-foreground">Очікую оплату</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4">
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
              Спробувати знову
            </button>
          </div>
        ) : debtors.length === 0 ? (
          <div className="rise-in flex flex-col items-center justify-center py-20 text-center">
            <span className="ibadge tint-emerald mb-4 h-16 w-16"><PartyPopper size={28} strokeWidth={2} /></span>
            <p className="text-lg font-semibold">Все оплачено 🎉</p>
            <p className="mt-1 text-sm text-muted-foreground">Немає боргів</p>
          </div>
        ) : (
          <>
            <div className="rise-in tint-rose rounded-2xl p-5 text-center">
              <p className="text-[0.72rem] font-bold uppercase tracking-wider opacity-80">Тобі винні</p>
              <p className="num-display mt-1 text-4xl text-foreground"><NumberFlow value={Math.round(totalDue)} />€</p>
              <p className="mt-1 text-sm font-medium opacity-80">за {decimalToHours(totalHours)} год роботи</p>
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
                  <span className="ibadge tint-indigo h-11 w-11 font-display text-base font-semibold">
                    {d.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{d.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={12} strokeWidth={2.3} /> {decimalToHours(d.hours)} год
                    </p>
                  </div>
                  <span className="tint-rose num-display rounded-xl px-3 py-1.5 text-sm">
                    <NumberFlow value={Math.round(d.remaining)} />€
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
