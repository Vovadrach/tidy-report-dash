import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Report, Client, WorkDay } from "@/types/report";
import {
  Clock, Wallet, TrendingUp, CircleCheckBig, CircleAlert, Users, ChevronDown, CalendarRange,
} from "lucide-react";
import { toast } from "sonner";
import NumberFlow from "@number-flow/react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BottomNavigation } from "@/components/BottomNavigation";
import { decimalToHours } from "@/utils/timeFormat";
import { useWorker } from "@/contexts/WorkerContext";

const MONTHS = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];

const workerData = (day: WorkDay, wid: string) => {
  if (wid === "all") return { amount: day.amount, hours: day.hours };
  const a = day.assignments?.find((x) => x.worker_id === wid || x.workerId === wid);
  return a ? { amount: a.amount, hours: a.hours } : { amount: 0, hours: 0 };
};

const Tile = ({ tint, icon: Icon, label, children }: { tint: string; icon: typeof Clock; label: string; children: React.ReactNode }) => (
  <div className={`rounded-2xl p-4 ${tint}`}>
    <div className="mb-2.5 flex items-center gap-2">
      <span className="ibadge h-8 w-8 bg-white/70"><Icon size={16} strokeWidth={2.4} /></span>
      <span className="text-[0.7rem] font-bold uppercase tracking-wider opacity-90">{label}</span>
    </div>
    <div className="num-display text-[1.5rem] leading-none text-foreground">{children}</div>
  </div>
);

export default function Dashboard() {
  const { selectedWorkerId } = useWorker();
  const [reports, setReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [month, setMonth] = useState<number | null>(new Date().getMonth());
  const [year, setYear] = useState<number | null>(new Date().getFullYear());
  const [clientId, setClientId] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsData, clientsData] = await Promise.all([api.getReports(), api.getClients()]);
      const recalc = reportsData.map((report) => {
        let totalMinutes = 0, totalEarned = 0, paidAmount = 0;
        (report.workDays || []).forEach((day) => {
          if (day.is_planned) return;
          const dayStatus = day.paymentStatus || day.payment_status;
          totalMinutes += Math.round((day.hours || 0) * 60);
          totalEarned += day.amount || 0;
          if (dayStatus === "paid") paidAmount += day.amount || 0;
          else if (dayStatus === "partial") paidAmount += day.day_paid_amount || 0;
        });
        return { ...report, totalHours: totalMinutes / 60, totalEarned, paidAmount, remainingAmount: totalEarned - paidAmount };
      });
      setReports(recalc);
      setClients(clientsData);
    } catch (e) {
      toast.error("Помилка завантаження");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = year === null ? "Весь час" : month === null ? `${year}` : `${MONTHS[month]} ${year}`;
  const clientLabel = clientId === "all" ? "Всі клієнти" : clients.find((c) => c.id === clientId)?.name || "Всі клієнти";

  const filtered = useMemo(() => {
    let list = [...reports];
    if (selectedWorkerId !== "all") {
      list = list
        .map((report) => {
          const wDays = (report.workDays || []).filter((d) => d.assignments?.some((a) => a.worker_id === selectedWorkerId || a.workerId === selectedWorkerId));
          if (wDays.length === 0) return null;
          let mins = 0, earned = 0, paid = 0;
          wDays.forEach((day) => {
            const wd = workerData(day, selectedWorkerId);
            mins += Math.round(wd.hours * 60);
            earned += wd.amount;
            const st = day.paymentStatus || day.payment_status;
            if (st === "paid") paid += wd.amount;
            else if (st === "partial" && (day.amount || 0) > 0) paid += (wd.amount / day.amount) * (day.day_paid_amount || 0);
          });
          return { ...report, workDays: wDays, totalHours: mins / 60, totalEarned: earned, paidAmount: paid, remainingAmount: earned - paid };
        })
        .filter(Boolean) as Report[];
    }
    if (clientId !== "all") list = list.filter((r) => (r.clientId || r.client_id) === clientId);
    if (year !== null) {
      list = list.filter((r) => {
        const d = new Date(r.date);
        return month !== null ? d.getMonth() === month && d.getFullYear() === year : d.getFullYear() === year;
      });
    }
    return list;
  }, [reports, clientId, month, year, selectedWorkerId]);

  const stats = useMemo(() => {
    const totalEarned = filtered.reduce((s, r) => s + (r.totalEarned || 0), 0);
    const totalPaid = filtered.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const totalHours = filtered.reduce((s, r) => s + (r.totalHours || 0), 0);
    return { totalEarned, totalPaid, totalHours, totalRemaining: totalEarned - totalPaid };
  }, [filtered]);

  const leaderboard = useMemo(() => {
    const m = new Map<string, { name: string; earned: number; hours: number }>();
    filtered.forEach((r) => {
      const id = r.clientId || r.client_id || "";
      const e = m.get(id) || { name: r.clientName || r.client_name || "Без імені", earned: 0, hours: 0 };
      e.earned += r.totalEarned || 0;
      e.hours += r.totalHours || 0;
      m.set(id, e);
    });
    return [...m.values()].sort((a, b) => b.earned - a.earned).slice(0, 5);
  }, [filtered]);

  const debts = useMemo(() => {
    const m = new Map<string, { name: string; remaining: number }>();
    filtered.forEach((r) => {
      const rem = (r.totalEarned || 0) - (r.paidAmount || 0);
      if (rem <= 0) return;
      const id = r.clientId || r.client_id || "";
      const e = m.get(id) || { name: r.clientName || r.client_name || "Без імені", remaining: 0 };
      e.remaining += rem;
      m.set(id, e);
    });
    return [...m.values()].sort((a, b) => b.remaining - a.remaining);
  }, [filtered]);

  const chip = (active: boolean) =>
    `press flex flex-1 items-center justify-between gap-1.5 rounded-full border px-3.5 py-2.5 text-sm font-semibold ${
      active ? "border-primary bg-[hsl(var(--t-indigo-bg))] text-primary" : "border-border bg-card text-foreground"
    }`;

  const paidFull = stats.totalRemaining <= 0 && stats.totalEarned > 0;

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto max-w-md space-y-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="ibadge tint-indigo h-9 w-9"><TrendingUp size={18} strokeWidth={2.3} /></span>
          <h1 className="text-xl font-bold text-foreground">Звіт</h1>
        </div>
        <div className="flex gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={chip(year !== new Date().getFullYear() || month !== new Date().getMonth())}>
                <span className="flex items-center gap-1.5 truncate"><CalendarRange size={15} strokeWidth={2.2} /> {periodLabel}</span>
                <ChevronDown size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[70vh] w-56 overflow-y-auto rounded-xl">
              <DropdownMenuItem onClick={() => { setYear(null); setMonth(null); }} className="font-semibold">
                Весь час
              </DropdownMenuItem>
              <div className="flex gap-1 px-2 py-1.5">
                {[2024, 2025, 2026, 2027].map((y) => (
                  <button
                    key={y}
                    onClick={() => { setYear(y); setMonth(null); }}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${year === y ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              {MONTHS.map((m, i) => (
                <DropdownMenuItem
                  key={i}
                  onClick={() => { setMonth(i); if (year === null) setYear(new Date().getFullYear()); }}
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
              <DropdownMenuItem onClick={() => setClientId("all")} className="font-semibold">Всі клієнти</DropdownMenuItem>
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
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Tile tint="tint-indigo" icon={TrendingUp} label="Зароблено"><NumberFlow value={Math.round(stats.totalEarned)} />€</Tile>
              <Tile tint="tint-violet" icon={Clock} label="Години">{decimalToHours(stats.totalHours)}</Tile>
              <Tile tint={paidFull ? "tint-emerald" : "tint-sky"} icon={CircleCheckBig} label="Сплачено"><NumberFlow value={Math.round(stats.totalPaid)} />€</Tile>
              <Tile tint="tint-rose" icon={CircleAlert} label="Залишок"><NumberFlow value={Math.round(stats.totalRemaining)} />€</Tile>
            </div>

            {clientId === "all" && debts.length > 0 && (
              <section className="card-flat rounded-2xl p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="ibadge tint-rose h-8 w-8"><CircleAlert size={16} strokeWidth={2.3} /></span>
                  <h2 className="font-semibold text-foreground">Борги по клієнтах</h2>
                </div>
                <div className="space-y-1.5">
                  {debts.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5">
                      <span className="text-sm font-semibold text-foreground">{d.name}</span>
                      <span className="num-display text-sm text-[hsl(var(--t-rose-fg))]">{Math.round(d.remaining)}€</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {clientId === "all" && leaderboard.length > 0 && (
              <section className="card-flat rounded-2xl p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="ibadge tint-indigo h-8 w-8"><Users size={16} strokeWidth={2.3} /></span>
                  <h2 className="font-semibold text-foreground">Топ клієнтів</h2>
                </div>
                <div className="space-y-1.5">
                  {leaderboard.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3.5 py-2.5">
                      <span className="ibadge tint-indigo h-7 w-7 font-display text-xs font-bold">{i + 1}</span>
                      <span className="flex-1 truncate text-sm font-semibold text-foreground">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{decimalToHours(c.hours)} год</span>
                      <span className="num-display w-16 text-right text-sm text-foreground">{Math.round(c.earned)}€</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">Немає даних за цей період</div>
            )}
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
