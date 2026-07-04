import { useMemo, useState } from "react";
import { Wallet as DollarSign, Clock, TrendUp as TrendingUp, UsersThree as Users, CaretDown as ChevronDown, WarningCircle as AlertCircle } from "@phosphor-icons/react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useClients, useWorkDays } from "@/data/queries";
import { useWorkerFilter } from "@/contexts/WorkerContext";
import { decimalToHours } from "@/domain/time";
import { clientBalances, debtors, periodStats } from "@/domain/stats";
import { monthName, monthRange, yearRange } from "@/domain/dates";
import type { DateRange } from "@/domain/dates";

const ALL_TIME: DateRange = { from: "0000-01-01", to: "9999-12-31" };

const Dashboard = () => {
  const { selectedWorkerId } = useWorkerFilter();
  const { data: workDays = [], isLoading, isError, refetch } = useWorkDays();
  const { data: clients = [] } = useClients();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number | null>(now.getFullYear());
  const [selectedClientId, setSelectedClientId] = useState<string>("all");

  const range: DateRange = useMemo(() => {
    if (selectedYear === null) return ALL_TIME;
    if (selectedMonth === null) return yearRange(selectedYear);
    return monthRange(new Date(selectedYear, selectedMonth, 1));
  }, [selectedMonth, selectedYear]);

  const daysInScope = useMemo(
    () => (selectedClientId === "all" ? workDays : workDays.filter((d) => d.clientId === selectedClientId)),
    [workDays, selectedClientId],
  );

  const daysInRange = useMemo(
    () => daysInScope.filter((d) => d.date >= range.from && d.date <= range.to),
    [daysInScope, range],
  );

  const stats = useMemo(
    () => periodStats(daysInScope, range, selectedWorkerId),
    [daysInScope, range, selectedWorkerId],
  );

  const debtsBreakdown = useMemo(
    () => debtors(daysInRange, selectedWorkerId),
    [daysInRange, selectedWorkerId],
  );

  const leaderboard = useMemo(
    () => clientBalances(daysInRange, selectedWorkerId).sort((a, b) => b.totalEarned - a.totalEarned),
    [daysInRange, selectedWorkerId],
  );

  const getPeriodLabel = () => {
    if (selectedYear === null) return "За весь період";
    if (selectedMonth === null) return `${selectedYear}`;
    return `${monthName(selectedMonth)} ${selectedYear}`;
  };

  const getClientLabel = (clientId: string) =>
    clientId === "all" ? "Всі клієнти" : clients.find((c) => c.id === clientId)?.name ?? "Всі клієнти";

  const isDefaultPeriod = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-lg animate-pulse">Завантаження...</p>
      </div>
    );
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
          <div className="flex gap-3 justify-center max-w-[600px] mx-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`group relative overflow-hidden px-5 py-3.5 rounded-full border shadow-xs hover:shadow-sm transition-all active:scale-[0.98] flex-1 min-w-0 ${
                  !isDefaultPeriod ? "bg-primary/10 border-primary/40" : "bg-card border-border"
                }`}>
                  <div className="relative flex items-center justify-between gap-2">
                    <span className={`font-bold text-sm truncate ${!isDefaultPeriod ? "text-primary" : "text-foreground"}`}>{getPeriodLabel()}</span>
                    <ChevronDown className="w-5 h-5 text-primary flex-shrink-0" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-[85vh] overflow-y-auto rounded-2xl z-[100] p-2 mt-2 w-[var(--radix-dropdown-menu-trigger-width)] shadow-lg">
                <div className="space-y-1.5">
                  <DropdownMenuItem
                    onClick={() => { setSelectedYear(null); setSelectedMonth(null); }}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                      selectedYear === null ? "bg-primary/15 text-primary" : "text-foreground hover:bg-primary/8"
                    }`}
                  >
                    За весь період
                  </DropdownMenuItem>

                  <div className="h-px bg-border my-1"></div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full bg-primary/10 px-3 py-2 rounded-lg font-bold text-sm text-foreground hover:bg-primary/15 transition-all flex items-center justify-between">
                        <span>Рік: {selectedYear ?? "Всі"}</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl z-[110] p-1.5 min-w-[140px] shadow-lg">
                      <div className="space-y-0.5">
                        {[2024, 2025, 2026, 2027, 2028].map((year) => (
                          <DropdownMenuItem
                            key={year}
                            onClick={() => {
                              if (selectedYear === year) { setSelectedYear(null); setSelectedMonth(null); }
                              else { setSelectedYear(year); setSelectedMonth(null); }
                            }}
                            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold ${
                              selectedYear === year ? "bg-primary/15 text-primary" : "text-foreground hover:bg-primary/8"
                            }`}
                          >
                            {year}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="h-px bg-border my-1"></div>

                  <div className="space-y-0.5">
                    {Array.from({ length: 12 }, (_, i) => (
                      <DropdownMenuItem
                        key={i}
                        onClick={() => {
                          setSelectedMonth(i);
                          if (selectedYear === null) setSelectedYear(now.getFullYear());
                        }}
                        className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold ${
                          selectedMonth === i ? "bg-primary/15 text-primary" : "text-foreground hover:bg-primary/8"
                        }`}
                      >
                        {monthName(i)}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`group relative overflow-hidden px-5 py-3.5 rounded-full border shadow-xs hover:shadow-sm transition-all active:scale-[0.98] flex-1 min-w-0 ${
                  selectedClientId !== "all" ? "bg-accent/12 border-accent/40" : "bg-card border-border"
                }`}>
                  <div className="relative flex items-center justify-between gap-2">
                    <span className={`font-bold text-sm truncate ${selectedClientId !== "all" ? "text-accent" : "text-foreground"}`}>{getClientLabel(selectedClientId)}</span>
                    <ChevronDown className="w-5 h-5 text-accent flex-shrink-0" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-2xl z-[100] p-2 mt-2 max-h-[85vh] overflow-y-auto w-[var(--radix-dropdown-menu-trigger-width)] shadow-lg">
                <div className="space-y-0.5">
                  <DropdownMenuItem
                    onClick={() => setSelectedClientId("all")}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold ${
                      selectedClientId === "all" ? "bg-accent/15 text-accent" : "text-foreground hover:bg-accent/8"
                    }`}
                  >
                    Всі клієнти
                  </DropdownMenuItem>
                  {clients.map((client) => (
                    <DropdownMenuItem
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold ${
                        selectedClientId === client.id ? "bg-accent/15 text-accent" : "text-foreground hover:bg-accent/8"
                      }`}
                    >
                      {client.name}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-24 pb-dock space-y-5">
        {selectedClientId !== "all" && (
          <div className="surface-card p-6 shadow-sm text-center">
            <h1 className="num-display text-2xl text-foreground">{getClientLabel(selectedClientId)}</h1>
          </div>
        )}

        <div className="surface-card rounded-3xl p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-tile stat-tile-money p-4">
              <div className="icon-badge icon-badge-money">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="micro-label mb-1">Зароблено</p>
                <div className="flex items-baseline gap-1">
                  <p className="num-display text-[1.4rem] text-foreground">{Math.round(stats.earned)}</p>
                  <p className="text-sm font-bold text-muted-foreground/70">€</p>
                </div>
              </div>
            </div>

            <div className="stat-tile stat-tile-time p-4">
              <div className="icon-badge icon-badge-time">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="micro-label mb-1">Години</p>
                <div className="flex items-baseline gap-1">
                  <p className="num-display text-[1.4rem] text-foreground">{decimalToHours(stats.hours)}</p>
                  <p className="text-sm font-bold text-muted-foreground/70">год</p>
                </div>
              </div>
            </div>

            <div className={`stat-tile p-4 ${stats.due < 0.005 && stats.earned > 0 ? "stat-tile-ok" : "stat-tile-neutral"}`}>
              <div className="icon-badge icon-badge-ok">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="micro-label mb-1">Сплачено</p>
                <div className="flex items-baseline gap-1">
                  <p className={`num-display text-[1.4rem] ${stats.due < 0.005 && stats.earned > 0 ? "text-success" : "text-foreground"}`}>{Math.round(stats.paid)}</p>
                  <p className="text-sm font-bold text-muted-foreground/70">€</p>
                </div>
              </div>
            </div>

            <div className={`stat-tile p-4 ${stats.due > 0.005 ? "stat-tile-due" : "stat-tile-neutral"}`}>
              <div className="icon-badge icon-badge-due">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="micro-label mb-1">Залишок</p>
                <div className="flex items-baseline gap-1">
                  <p className="num-display text-[1.4rem] text-foreground">{Math.round(stats.due)}</p>
                  <p className="text-sm font-bold text-muted-foreground/70">€</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedClientId === "all" && debtsBreakdown.length > 0 && (
          <div className="surface-card p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-badge icon-badge-due">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h2 className="num-display text-xl text-foreground">Борги по клієнтах</h2>
            </div>
            <div className="space-y-2.5">
              {debtsBreakdown.map((debt) => (
                <div key={debt.clientId} className="flex items-center justify-between p-3.5 bg-warning/5 rounded-xl border border-warning/15 transition-smooth hover:bg-warning/10">
                  <span className="font-semibold text-foreground text-sm">{debt.clientName}</span>
                  <span className="chip chip-due text-sm">{Math.round(debt.totalDue)}€</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedClientId === "all" && leaderboard.length > 0 && (
          <div className="surface-card p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-badge icon-badge-time">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="num-display text-xl text-foreground">Топ клієнтів</h2>
            </div>
            <div className="space-y-2.5">
              {leaderboard.slice(0, 5).map((client, index) => (
                <div key={client.clientId} className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl border border-border/50 transition-smooth hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm border border-primary/20 tabular-nums">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-foreground text-sm">{client.clientName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground font-medium tabular-nums">{decimalToHours(client.totalHours)} год</p>
                    <p className="font-bold text-success text-base min-w-[60px] text-right tabular-nums">{Math.round(client.totalEarned)}€</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Dashboard;
