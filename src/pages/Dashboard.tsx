import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Report, Client, WorkDay, PaymentStatus } from "@/types/report";
import { Wallet as DollarSign, Clock, TrendUp as TrendingUp, UsersThree as Users, CaretDown as ChevronDown, WarningCircle as AlertCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BottomNavigation } from "@/components/BottomNavigation";
import { decimalToHours } from "@/utils/timeFormat";
import { useWorker } from "@/contexts/WorkerContext";

// Helper function to extract worker-specific data from work day
const getWorkerDataFromWorkDay = (day: WorkDay, workerId: string | 'all') => {
  if (workerId === 'all') {
    return { amount: day.amount, hours: day.hours };
  }

  const assignment = day.assignments?.find(a =>
    (a.worker_id === workerId || a.workerId === workerId)
  );

  if (assignment) {
    return { amount: assignment.amount, hours: assignment.hours };
  }

  return { amount: 0, hours: 0 };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedWorkerId } = useWorker();
  const [reports, setReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const getMonthLabel = () => {
    if (selectedMonth === null) return "Всі місяці";
    const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
                        "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
    return monthNames[selectedMonth];
  };

  const getPeriodLabel = () => {
    if (selectedYear === null) return "За весь період";
    if (selectedMonth === null) return `${selectedYear}`;
    return `${getMonthLabel()} ${selectedYear}`;
  };

  const getClientLabel = (clientId: string) => {
    if (clientId === "all") return "Всі клієнти";
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Всі клієнти";
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      loadData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    loadData();
  }, [location.pathname]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reportsData, clientsData] = await Promise.all([
        api.getReports(),
        api.getClients()
      ]);
      
      const reportsWithRecalculatedPayments = reportsData.map(report => {
        const workDays = report.workDays || [];
        
        let totalMinutes = 0;
        let totalEarned = 0;
        let paidAmount = 0;
        
        workDays.forEach(day => {
          const dayHours = day.hours || 0;
          const dayAmount = day.amount || 0;
          const dayStatus = day.paymentStatus || day.payment_status;
          const dayPaid = day.day_paid_amount || 0;
          
          totalMinutes += Math.round(dayHours * 60);
          totalEarned += dayAmount;
          
          if (dayStatus === 'paid') {
            paidAmount += dayAmount;
          } else if (dayStatus === 'partial') {
            paidAmount += dayPaid;
          }
        });
        
        const totalHours = totalMinutes / 60;
        const remainingAmount = totalEarned - paidAmount;
        
        let paymentStatus: PaymentStatus = 'unpaid';
        if (paidAmount === totalEarned && totalEarned > 0) {
          paymentStatus = 'paid';
        } else if (paidAmount > 0) {
          paymentStatus = 'partial';
        }
        
        return {
          ...report,
          totalHours,
          totalEarned,
          paidAmount,
          remainingAmount,
          paymentStatus,
        };
      });
      
      setReports(reportsWithRecalculatedPayments);
      setClients(clientsData);
    } catch (error) {
      const errorMessage = 'Помилка завантаження даних';
      toast.error(errorMessage);
      setError(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    let filtered = [...reports];

    // Filter by worker
    if (selectedWorkerId !== 'all') {
      filtered = filtered.map(report => {
        const filteredWorkDays = (report.workDays || []).filter(day => {
          const hasAssignment = day.assignments?.some(a =>
            a.worker_id === selectedWorkerId || a.workerId === selectedWorkerId
          );
          return hasAssignment;
        });

        // Only include report if it has work days for this worker
        if (filteredWorkDays.length === 0) return null;

        // Recalculate totals based on worker-specific data
        let totalMinutes = 0;
        let totalEarned = 0;
        let paidAmount = 0;

        filteredWorkDays.forEach(day => {
          // Get worker-specific data from assignments
          const workerData = getWorkerDataFromWorkDay(day, selectedWorkerId);

          totalMinutes += Math.round(workerData.hours * 60);
          totalEarned += workerData.amount;

          const dayStatus = day.paymentStatus || day.payment_status;
          if (dayStatus === 'paid') {
            // Worker gets their full share
            paidAmount += workerData.amount;
          } else if (dayStatus === 'partial') {
            // Calculate worker's proportional share of partial payment
            const dayTotalAmount = day.amount || 0;
            if (dayTotalAmount > 0) {
              const workerShare = (workerData.amount / dayTotalAmount) * (day.day_paid_amount || 0);
              paidAmount += workerShare;
            }
          }
        });

        return {
          ...report,
          workDays: filteredWorkDays,
          totalHours: totalMinutes / 60,
          totalEarned,
          paidAmount,
          remainingAmount: totalEarned - paidAmount
        };
      }).filter(r => r !== null) as Report[];
    }

    if (selectedClientId !== "all") {
      filtered = filtered.filter((r) => (r.clientId || r.client_id) === selectedClientId);
    }

    // Filter by period
    if (selectedYear !== null) {
      filtered = filtered.filter((r) => {
        const reportDate = new Date(r.date);
        if (selectedMonth !== null) {
          // Filter by specific month and year
          return reportDate.getMonth() === selectedMonth && reportDate.getFullYear() === selectedYear;
        } else {
          // Filter by year only
          return reportDate.getFullYear() === selectedYear;
        }
      });
    }
    // If selectedYear is null, show all periods (no filtering)

    return filtered;
  }, [reports, selectedClientId, selectedMonth, selectedYear, selectedWorkerId]);

  const stats = useMemo(() => {
    // Розраховуємо статистику тільки для відфільтрованих звітів
    const totalEarned = filteredReports.reduce((sum, r) => sum + (r.totalEarned || r.total_earned || 0), 0);
    const totalPaid = filteredReports.reduce((sum, r) => sum + (r.paidAmount || r.paid_amount || 0), 0);
    const totalRemaining = totalEarned - totalPaid; // Розраховуємо залишок правильно
    const totalHours = filteredReports.reduce((sum, r) => sum + (r.totalHours || r.total_hours || 0), 0);

    return {
      totalEarned,
      totalPaid,
      totalRemaining,
      totalHours,
    };
  }, [filteredReports]);

  const clientLeaderboard = useMemo(() => {
    const clientStats = new Map<string, { name: string; earned: number; hours: number; remaining: number }>();

    filteredReports.forEach((report) => {
      const clientId = report.clientId || report.client_id || '';
      const clientName = report.clientName || report.client_name || 'Без імені';
      const totalEarned = report.totalEarned || report.total_earned || 0;
      const totalHours = report.totalHours || report.total_hours || 0;
      const paidAmount = report.paidAmount || report.paid_amount || 0;
      const remainingAmount = totalEarned - paidAmount;
      
      const existing = clientStats.get(clientId) || { name: clientName, earned: 0, hours: 0, remaining: 0 };
      clientStats.set(clientId, {
        name: clientName,
        earned: existing.earned + totalEarned,
        hours: existing.hours + totalHours,
        remaining: existing.remaining + remainingAmount,
      });
    });

    // Сортуємо за заробітком (від більшого до меншого)
    return Array.from(clientStats.values()).sort((a, b) => b.earned - a.earned);
  }, [filteredReports]);

  const debtsBreakdown = useMemo(() => {
    const debts = new Map<string, { name: string; remaining: number }>();

    filteredReports
      .forEach((report) => {
        const clientId = report.clientId || report.client_id || '';
        const clientName = report.clientName || report.client_name || 'Без імені';
        // Розраховуємо залишок правильно: загальна сума - оплачена сума
        const totalEarned = report.totalEarned || report.total_earned || 0;
        const paidAmount = report.paidAmount || report.paid_amount || 0;
        const remainingAmount = totalEarned - paidAmount;
        
        // Додаємо тільки якщо є борг
        if (remainingAmount > 0) {
          const existing = debts.get(clientId) || { name: clientName, remaining: 0 };
          debts.set(clientId, {
            name: clientName,
            remaining: existing.remaining + remainingAmount,
          });
        }
      });

    return Array.from(debts.values()).sort((a, b) => b.remaining - a.remaining);
  }, [filteredReports]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground text-lg">Завантаження...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground text-lg mb-4">{error}</p>
          <Button onClick={loadData}>Спробувати знову</Button>
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
                  selectedYear !== null && selectedYear !== new Date().getFullYear() || selectedMonth !== new Date().getMonth()
                    ? "bg-primary/10 border-primary/40"
                    : "bg-card border-border"
                }`}>
                  <div className="relative flex items-center justify-between gap-2">
                    <span className={`font-bold text-sm truncate ${
                      selectedYear !== null && (selectedYear !== new Date().getFullYear() || selectedMonth !== new Date().getMonth())
                        ? "text-primary"
                        : "text-foreground"
                    }`}>{getPeriodLabel()}</span>
                    <ChevronDown className="w-5 h-5 text-primary flex-shrink-0 stroke-[2.5]" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-[85vh] overflow-y-auto rounded-2xl z-[100] p-2 mt-2 w-[var(--radix-dropdown-menu-trigger-width)] shadow-lg" sideOffset={8}>
                <div className="space-y-1.5">
                  {/* All Time Option */}
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedYear(null);
                      setSelectedMonth(null);
                    }}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                      selectedYear === null
                        ? "bg-primary/15 text-primary"
                        : "text-foreground hover:bg-primary/8"
                    }`}
                  >
                    За весь період
                  </DropdownMenuItem>

                  {/* Divider */}
                  <div className="h-px bg-border my-1"></div>

                  {/* Year Selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full bg-primary/10 px-3 py-2 rounded-lg font-bold text-sm text-foreground hover:bg-primary/15 transition-all duration-200 flex items-center justify-between">
                        <span>Рік: {selectedYear ?? "Всі"}</span>
                        <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl z-[110] p-1.5 min-w-[140px] shadow-lg">
                      <div className="space-y-0.5">
                        {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
                          <DropdownMenuItem
                            key={year}
                            onClick={() => {
                              if (selectedYear === year) {
                                // Clicking the same year again deselects it and shows all time
                                setSelectedYear(null);
                                setSelectedMonth(null);
                              } else {
                                setSelectedYear(year);
                                setSelectedMonth(null);
                              }
                            }}
                            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                              selectedYear === year
                                ? "bg-primary/15 text-primary"
                                : "text-foreground hover:bg-primary/8"
                            }`}
                          >
                            {year}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Divider */}
                  <div className="h-px bg-border my-1"></div>

                  {/* Months */}
                  <div className="space-y-0.5">
                    {Array.from({ length: 12 }, (_, i) => {
                      const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
                                          "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
                      return (
                        <DropdownMenuItem
                          key={i}
                          onClick={() => {
                            setSelectedMonth(i);
                            if (selectedYear === null) {
                              setSelectedYear(new Date().getFullYear());
                            }
                          }}
                          className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                            selectedMonth === i
                              ? "bg-primary/15 text-primary"
                              : "text-foreground hover:bg-primary/8"
                          }`}
                        >
                          {monthNames[i]}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`group relative overflow-hidden px-5 py-3.5 rounded-full border shadow-xs hover:shadow-sm transition-all active:scale-[0.98] flex-1 min-w-0 ${
                  selectedClientId !== "all"
                    ? "bg-accent/12 border-accent/40"
                    : "bg-card border-border"
                }`}>
                  <div className="relative flex items-center justify-between gap-2">
                    <span className={`font-bold text-sm truncate ${
                      selectedClientId !== "all"
                        ? "text-accent"
                        : "text-foreground"
                    }`}>{getClientLabel(selectedClientId)}</span>
                    <ChevronDown className="w-5 h-5 text-accent flex-shrink-0 stroke-[2.5]" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-2xl z-[100] p-2 mt-2 max-h-[85vh] overflow-y-auto w-[var(--radix-dropdown-menu-trigger-width)] shadow-lg" sideOffset={8}>
                <div className="space-y-0.5">
                  <DropdownMenuItem
                    onClick={() => setSelectedClientId("all")}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                      selectedClientId === "all"
                        ? "bg-accent/15 text-accent"
                        : "text-foreground hover:bg-accent/8"
                    }`}
                  >
                    Всі клієнти
                  </DropdownMenuItem>
                  {clients.map((client) => (
                    <DropdownMenuItem
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                        selectedClientId === client.id
                          ? "bg-accent/15 text-accent"
                          : "text-foreground hover:bg-accent/8"
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
        {/* Client Name Header - показується тільки при виборі конкретного клієнта */}
        {selectedClientId !== "all" && (
          <div className="surface-card p-6 shadow-sm text-center">
            <h1 className="num-display text-2xl text-foreground">{getClientLabel(selectedClientId)}</h1>
          </div>
        )}

        {/* Statistics Cards - Unified 4-card grid with elevated design */}
        <div className="surface-card rounded-3xl p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
          {/* PRIMARY CARDS - Main Information */}

          {/* Total Earned */}
          <div className="stat-tile stat-tile-money p-4">
            <div className="icon-badge icon-badge-money">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="micro-label mb-1">Зароблено</p>
              <div className="flex items-baseline gap-1">
                <p className="num-display text-[1.4rem] text-foreground">{Math.round(stats.totalEarned)}</p>
                <p className="text-sm font-bold text-muted-foreground/70">€</p>
              </div>
            </div>
          </div>

          {/* Total Hours */}
          <div className="stat-tile stat-tile-time p-4">
            <div className="icon-badge icon-badge-time">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="micro-label mb-1">Години</p>
              <div className="flex items-baseline gap-1">
                <p className="num-display text-[1.4rem] text-foreground">{decimalToHours(stats.totalHours)}</p>
                <p className="text-sm font-bold text-muted-foreground/70">год</p>
              </div>
            </div>
          </div>

          {/* SECONDARY CARDS - Less prominent styling */}

          {/* Paid Amount */}
          <div className={`stat-tile p-4 ${
            stats.totalRemaining === 0 && stats.totalEarned > 0 ? "stat-tile-ok" : "stat-tile-neutral"
          }`}>
            <div className="icon-badge icon-badge-ok">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="micro-label mb-1">Сплачено</p>
              <div className="flex items-baseline gap-1">
                <p className={`num-display text-[1.4rem] ${
                  stats.totalRemaining === 0 && stats.totalEarned > 0 ? "text-success" : "text-foreground"
                }`}>{Math.round(stats.totalPaid)}</p>
                <p className="text-sm font-bold text-muted-foreground/70">€</p>
              </div>
            </div>
          </div>

          {/* Remaining Amount */}
          <div className={`stat-tile p-4 ${stats.totalRemaining > 0 ? "stat-tile-due" : "stat-tile-neutral"}`}>
            <div className="icon-badge icon-badge-due">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="micro-label mb-1">Залишок</p>
              <div className="flex items-baseline gap-1">
                <p className="num-display text-[1.4rem] text-foreground">{Math.round(stats.totalRemaining)}</p>
                <p className="text-sm font-bold text-muted-foreground/70">€</p>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Debts Breakdown - тільки для всіх клієнтів */}
        {selectedClientId === "all" && debtsBreakdown.length > 0 && (
          <div className="surface-card p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-badge icon-badge-due">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h2 className="num-display text-xl text-foreground">Борги по клієнтах</h2>
            </div>
            <div className="space-y-2.5">
              {debtsBreakdown.map((debt, index) => (
                <div key={index} className="flex items-center justify-between p-3.5 bg-warning/5 rounded-xl border border-warning/15 transition-smooth hover:bg-warning/10">
                  <span className="font-semibold text-foreground text-sm">{debt.name}</span>
                  <span className="chip chip-due text-sm">{Math.round(debt.remaining)}€</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client Leaderboard - тільки для всіх клієнтів */}
        {selectedClientId === "all" && clientLeaderboard.length > 0 && (
          <div className="surface-card p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-badge icon-badge-money">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="num-display text-xl text-foreground">Топ клієнтів</h2>
            </div>
            <div className="space-y-2.5">
              {clientLeaderboard.slice(0, 5).map((client, index) => (
                <div key={index} className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl border border-border/50 transition-smooth hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm border border-primary/20 tabular-nums">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-foreground text-sm">{client.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground font-medium tabular-nums">{decimalToHours(client.hours)} год</p>
                    <p className="font-bold text-success text-base min-w-[60px] text-right tabular-nums">{Math.round(client.earned)}€</p>
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
