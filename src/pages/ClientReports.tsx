import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { WorkDay, Client, PaymentStatus } from "@/types/report";
import {
  Clock, ArrowLeft, CircleCheck, CircleDashed, Circle, CheckCheck, StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import NumberFlow from "@number-flow/react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BottomNavigation } from "@/components/BottomNavigation";
import { decimalToHours } from "@/utils/timeFormat";
import { useWorker } from "@/contexts/WorkerContext";

const workerData = (day: WorkDay, wid: string) => {
  if (wid === "all") return { amount: day.amount, hours: day.hours };
  const a = day.assignments?.find((x) => x.worker_id === wid || x.workerId === wid);
  return a ? { amount: a.amount, hours: a.hours } : { amount: 0, hours: 0 };
};

type UDay = WorkDay & { reportId: string };
const STATUS_META = {
  paid: { icon: CircleCheck, tint: "tint-emerald" },
  partial: { icon: CircleDashed, tint: "tint-amber" },
  unpaid: { icon: Circle, tint: "tint-rose" },
} as const;

export default function ClientReports() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { selectedWorkerId } = useWorker();
  const [client, setClient] = useState<Client | null>(null);
  const [days, setDays] = useState<UDay[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, selectedWorkerId]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [reports, clients] = await Promise.all([api.getReports(), api.getClients()]);
      setClient(clients.find((c) => c.id === clientId) || null);
      const out: UDay[] = [];
      reports
        .filter((r) => (r.clientId || r.client_id) === clientId)
        .forEach((r) =>
          r.workDays.forEach((day) => {
            if (day.is_planned) return;
            const status = day.paymentStatus || day.payment_status;
            if (selectedWorkerId !== "all") {
              const has = day.assignments?.some((a) => a.worker_id === selectedWorkerId || a.workerId === selectedWorkerId);
              if (!has || workerData(day, selectedWorkerId).amount === 0 || status === "paid") return;
              out.push({ ...day, reportId: r.id });
            } else if (status === "unpaid" || status === "partial") {
              out.push({ ...day, reportId: r.id });
            }
          }),
        );
      setDays(out);
    } catch (e) {
      toast.error("Помилка завантаження");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (dayId: string, next: PaymentStatus, amount: number) => {
    setDays((prev) => (prev ? prev.filter((d) => (next === "paid" ? d.id !== dayId : true)) : prev));
    try {
      await api.updateWorkDay(dayId, {
        payment_status: next,
        day_paid_amount: next === "paid" ? amount : next === "unpaid" ? 0 : undefined,
      });
      loadData(true);
    } catch (e) {
      toast.error("Помилка оновлення");
      loadData(true);
      console.error(e);
    }
  };

  const markAllPaid = async () => {
    if (!days || days.length === 0) return;
    const list = [...days];
    setDays([]);
    try {
      await Promise.all(list.map((d) => api.updateWorkDay(d.id, { payment_status: "paid" as PaymentStatus, day_paid_amount: d.amount })));
      toast.success(`Оплачено ${list.length} записів`);
      loadData(true);
    } catch (e) {
      toast.error("Помилка");
      loadData(true);
      console.error(e);
    }
  };

  const remainingOf = (day: UDay) => {
    const wd = workerData(day, selectedWorkerId);
    const status = day.paymentStatus || day.payment_status;
    if (status !== "partial") return wd.amount;
    const paid =
      selectedWorkerId !== "all" && day.amount > 0
        ? (wd.amount / day.amount) * (day.day_paid_amount || 0)
        : day.day_paid_amount || 0;
    return wd.amount - paid;
  };

  const totalDue = days?.reduce((s, d) => s + remainingOf(d), 0) || 0;
  const totalHours =
    days?.reduce((s, d) => {
      const wd = workerData(d, selectedWorkerId);
      const status = d.paymentStatus || d.payment_status;
      if (status === "unpaid") return s + wd.hours;
      const rem = remainingOf(d);
      return s + (wd.amount > 0 ? wd.hours * (rem / wd.amount) : 0);
    }, 0) || 0;

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-md items-center gap-3 px-4 pt-3">
        <button
          type="button"
          aria-label="Назад"
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
          <h1 className="truncate text-lg font-bold text-foreground">{client?.name || "Клієнт"}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4">
        {loading ? (
          <>
            <div className="skeleton h-32 rounded-2xl" />
            <div className="skeleton h-16 rounded-2xl" />
          </>
        ) : !days || days.length === 0 ? (
          <div className="rise-in flex flex-col items-center justify-center py-20 text-center">
            <span className="ibadge tint-emerald mb-4 h-16 w-16"><CircleCheck size={28} strokeWidth={2} /></span>
            <p className="text-lg font-semibold">Все оплачено</p>
            <p className="mt-1 text-sm text-muted-foreground">Немає боргів у цього клієнта</p>
          </div>
        ) : (
          <>
            <div className="card-flat space-y-3 rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="tint-rose rounded-xl p-3.5 text-center">
                  <p className="text-[0.7rem] font-bold uppercase tracking-wider opacity-80">Борг</p>
                  <p className="num-display mt-0.5 text-2xl text-foreground"><NumberFlow value={Math.round(totalDue)} />€</p>
                </div>
                <div className="tint-violet rounded-xl p-3.5 text-center">
                  <p className="text-[0.7rem] font-bold uppercase tracking-wider opacity-80">Години</p>
                  <p className="num-display mt-0.5 text-2xl text-foreground">{decimalToHours(totalHours)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={markAllPaid}
                className="press flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--success))] py-3 text-sm font-bold text-white"
              >
                <CheckCheck size={18} strokeWidth={2.5} /> Оплачено всі ({days.length})
              </button>
            </div>

            <div className="space-y-2.5">
              {days.map((day, i) => {
                const status = (day.paymentStatus || day.payment_status || "unpaid") as PaymentStatus;
                const wd = workerData(day, selectedWorkerId);
                const meta = STATUS_META[status];
                const Icon = meta.icon;
                const rem = Math.round(remainingOf(day));
                return (
                  <div
                    key={`${day.reportId}-${day.id}`}
                    style={{ animationDelay: `${Math.min(i * 0.035, 0.22)}s` }}
                    className="card-flat rise-in flex items-center gap-3 rounded-2xl p-3.5"
                  >
                    {selectedWorkerId === "all" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={`ibadge press h-9 w-9 ${meta.tint}`} aria-label="Статус">
                            <Icon size={18} strokeWidth={2.4} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-xl">
                          <DropdownMenuItem onClick={() => changeStatus(day.id, "paid", day.amount)}>
                            <CircleCheck size={16} className="text-success" /> Оплачено
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changeStatus(day.id, "unpaid", 0)}>
                            <Circle size={16} className="text-destructive" /> Не оплачено
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className={`ibadge h-9 w-9 ${meta.tint}`}><Icon size={18} strokeWidth={2.4} /></span>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate(`/report/${day.reportId}/day/${day.id}`, { viewTransition: true })}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="font-semibold text-foreground">
                        {new Date(day.date + "T00:00:00").toLocaleDateString("uk-UA")}
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
