import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api";
import { useWorker } from "@/contexts/WorkerContext";
import { BottomNavigation } from "@/components/BottomNavigation";
import { MonthHeader } from "@/components/home/MonthHeader";
import { WorkerChips } from "@/components/home/WorkerChips";
import { StatTiles } from "@/components/home/StatTiles";
import { DayCard, type DayItem } from "@/components/home/DayCard";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type AnyReport = {
  id: string;
  clientId?: string;
  client_id?: string;
  clientName?: string;
  client_name?: string;
  workDays?: AnyDay[];
};
type AnyDay = {
  id: string;
  date: string;
  hours?: number;
  amount?: number;
  paymentStatus?: string;
  payment_status?: string;
  day_paid_amount?: number;
  is_planned?: boolean;
  note?: string;
  assignments?: {
    worker_id?: string | null;
    workerId?: string | null;
    hours?: number;
    amount?: number;
    deleted_worker_name?: string | null;
    worker?: { name?: string; color?: string } | null;
  }[];
};

const buildDays = (reports: AnyReport[], wid: string, monthPrefix: string, noName: string): DayItem[] => {
  const out: DayItem[] = [];
  for (const r of reports) {
    const clientName = r.clientName || r.client_name || noName;
    const clientId = r.clientId || r.client_id || "";
    for (const d of r.workDays || []) {
      if (!d.date?.startsWith(monthPrefix)) continue;
      const assigns = d.assignments || [];
      const status = (d.paymentStatus || d.payment_status || "unpaid") as DayItem["status"];
      const base = {
        reportId: r.id,
        id: d.id,
        clientId,
        clientName,
        date: d.date,
        paidAmount: d.day_paid_amount || 0,
        status,
        isPlanned: !!d.is_planned,
        note: d.note,
      };
      if (wid === "all") {
        out.push({
          ...base,
          hours: d.hours || 0,
          amount: d.amount || 0,
          workers: assigns.map((a) => ({
            name: a.worker?.name ?? a.deleted_worker_name ?? "?",
            color: a.worker?.color ?? "#94a3b8",
          })),
        });
      } else {
        const mine = assigns.filter((a) => (a.worker_id || a.workerId) === wid);
        if (mine.length === 0) continue;
        out.push({
          ...base,
          hours: mine.reduce((s, a) => s + (a.hours || 0), 0),
          amount: mine.reduce((s, a) => s + (a.amount || 0), 0),
          workers: [{ name: mine[0].worker?.name ?? "?", color: mine[0].worker?.color ?? "#94a3b8" }],
        });
      }
    }
  }
  return out;
};

export default function Index() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedWorkerId } = useWorker();
  const { t, weekdays } = useI18n();

  const now = useMemo(() => new Date(), []);
  const [anchor, setAnchor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));

  const { data: reports = [], isLoading } = useQuery<AnyReport[]>({
    queryKey: ["reports"],
    queryFn: api.getReports,
  });

  const setStatus = useMutation({
    mutationFn: (v: { dayId: string; status: DayItem["status"]; paidAmount: number }) =>
      api.updateWorkDay(v.dayId, { payment_status: v.status, day_paid_amount: v.paidAmount }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
    onError: () => toast.error(t("toast.statusError")),
  });

  const monthPrefix = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}`;
  const isCurrent = anchor.getFullYear() === now.getFullYear() && anchor.getMonth() === now.getMonth();

  const days = useMemo(
    () => buildDays(reports, selectedWorkerId, monthPrefix, t("common.noName")),
    [reports, selectedWorkerId, monthPrefix, t],
  );

  const stats = useMemo(() => {
    let hours = 0, earned = 0, paid = 0;
    for (const d of days) {
      if (d.isPlanned) continue;
      hours += d.hours;
      earned += d.amount;
      paid += Math.min(d.paidAmount, d.amount);
    }
    return { hours, earned, paid };
  }, [days]);

  const groups = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    for (const d of [...days].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))) {
      const arr = map.get(d.date) ?? [];
      arr.push(d);
      map.set(d.date, arr);
    }
    return [...map.entries()];
  }, [days]);

  const openDay = (d: DayItem) => {
    if (d.isPlanned) {
      navigate(`/create-report?clientId=${d.clientId}&date=${d.date}&workDayId=${d.id}&reportId=${d.reportId}`, {
        viewTransition: true,
      });
    } else {
      navigate(`/report/${d.reportId}/day/${d.id}`, { viewTransition: true });
    }
  };

  const addOnDate = (date: string) =>
    navigate(`/select-client?date=${date}`, { viewTransition: true });

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto max-w-md space-y-3.5 px-4 pt-3">
        <MonthHeader
          date={anchor}
          isCurrent={isCurrent}
          onPrev={() => setAnchor((a) => new Date(a.getFullYear(), a.getMonth() - 1, 1))}
          onNext={() => setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + 1, 1))}
          onToday={() => setAnchor(new Date(now.getFullYear(), now.getMonth(), 1))}
        />
        <StatTiles hours={stats.hours} earned={stats.earned} />
      </header>

      <main className="mx-auto max-w-md space-y-5 px-4 pb-[calc(10.5rem+env(safe-area-inset-bottom))] pt-5">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="rise-in flex flex-col items-center justify-center py-16 text-center">
            <span className="ibadge tint-indigo mb-4 h-16 w-16">
              <CalendarPlus size={28} strokeWidth={2} />
            </span>
            <p className="text-lg font-semibold">{t("home.empty.title")}</p>
            <p className="mt-1 max-w-56 text-sm text-muted-foreground">{t("home.empty.sub")}</p>
          </div>
        ) : (
          groups.map(([date, items]) => {
            const [y, m, dd] = date.split("-").map(Number);
            const dow = weekdays[new Date(y, m - 1, dd).getDay()];
            const today = iso(now) === date;
            return (
              <section key={date} className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
                      today
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground"
                    }`}
                  >
                    <span className="font-display">{dd}</span> {dow}
                    {today && ` · ${t("common.today")}`}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                  <button
                    type="button"
                    aria-label={t("home.addOnDay")}
                    onClick={() => addOnDate(date)}
                    className="press text-muted-foreground active:text-primary"
                  >
                    <CalendarPlus size={18} />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((d, i) => (
                    <DayCard
                      key={`${d.reportId}-${d.id}`}
                      day={d}
                      index={i}
                      onOpen={() => openDay(d)}
                      onStatus={(dayId, status, paidAmount) =>
                        setStatus.mutate({ dayId, status, paidAmount })
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      <BottomNavigation above={<WorkerChips />} />
    </div>
  );
}
