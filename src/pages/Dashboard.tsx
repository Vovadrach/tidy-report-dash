import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Report, Client } from "@/types/report";
import { DollarSign, Clock, TrendingUp, Users, ChevronDown, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BottomNavigation } from "@/components/BottomNavigation";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
        
        let totalHours = 0;
        let totalEarned = 0;
        let paidAmount = 0;
        
        workDays.forEach(day => {
          const dayHours = day.hours || 0;
          const dayAmount = day.amount || 0;
          const dayStatus = day.paymentStatus || day.payment_status;
          const dayPaid = day.day_paid_amount || 0;
          
          totalHours += dayHours;
          totalEarned += dayAmount;
          
          if (dayStatus === 'paid') {
            paidAmount += dayAmount;
          } else if (dayStatus === 'partial') {
            paidAmount += dayPaid;
          }
        });
        
        const remainingAmount = totalEarned - paidAmount;
        
        let paymentStatus = 'unpaid';
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
  }, [reports, selectedClientId, selectedMonth, selectedYear]);

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

    // Сортуємо за залишком (боргом) замість загального заробітку
    return Array.from(clientStats.values()).sort((a, b) => b.remaining - a.remaining);
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
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <p className="text-foreground text-lg">Завантаження...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground text-lg mb-4">{error}</p>
          <Button onClick={loadData}>Спробувати знову</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 pt-4">
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border-b border-white/10 shadow-[0_2px_16px_0_rgba(31,38,135,0.1)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-3 justify-center max-w-[600px] mx-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`group relative overflow-hidden backdrop-blur-xl px-6 py-3.5 rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 flex-1 min-w-0 ${
                  selectedYear !== null && selectedYear !== new Date().getFullYear() || selectedMonth !== new Date().getMonth()
                    ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-blue-400/50 dark:border-blue-600/50"
                    : "bg-card border-border"
                }`}>
                  <div className="relative flex items-center justify-between gap-2">
                    <span className={`font-bold text-sm truncate ${
                      selectedYear !== null && (selectedYear !== new Date().getFullYear() || selectedMonth !== new Date().getMonth())
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-foreground"
                    }`}>{getPeriodLabel()}</span>
                    <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400 transition-colors duration-300 flex-shrink-0 stroke-[2.5]" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card backdrop-blur-xl border border-border shadow-lg max-h-[85vh] overflow-y-auto rounded-xl z-[100] p-2 mt-2 w-[var(--radix-dropdown-menu-trigger-width)]" sideOffset={8}>
                <div className="space-y-1.5">
                  {/* All Time Option */}
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedYear(null);
                      setSelectedMonth(null);
                    }}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                      selectedYear === null
                        ? "bg-gradient-to-r from-purple-500/40 to-pink-500/40 dark:from-purple-600/40 dark:to-pink-600/40 text-foreground shadow-md"
                        : "text-foreground hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20"
                    }`}
                  >
                    За весь період
                  </DropdownMenuItem>

                  {/* Divider */}
                  <div className="h-px bg-border my-1"></div>

                  {/* Year Selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md px-3 py-2 rounded-lg font-bold text-sm text-foreground hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 flex items-center justify-between">
                        <span>Рік: {selectedYear ?? "Всі"}</span>
                        <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card backdrop-blur-xl border border-border shadow-lg rounded-lg z-[110] p-1.5 min-w-[140px]">
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
                                ? "bg-gradient-to-r from-blue-500/40 to-purple-500/40 text-foreground"
                                : "text-foreground hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20"
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
                              ? "bg-gradient-to-r from-blue-500/40 to-purple-500/40 text-foreground shadow-md"
                              : "text-foreground hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20"
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
                <button className={`group relative overflow-hidden backdrop-blur-xl px-6 py-3.5 rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 flex-1 min-w-0 ${
                  selectedClientId !== "all"
                    ? "bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border-emerald-400/50 dark:border-emerald-600/50"
                    : "bg-card border-border"
                }`}>
                  <div className="relative flex items-center justify-between gap-2">
                    <span className={`font-bold text-sm truncate ${
                      selectedClientId !== "all"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-foreground"
                    }`}>{getClientLabel(selectedClientId)}</span>
                    <ChevronDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400 transition-colors duration-300 flex-shrink-0 stroke-[2.5]" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card backdrop-blur-xl border border-border shadow-lg rounded-xl z-[100] p-2 mt-2 max-h-[85vh] overflow-y-auto w-[var(--radix-dropdown-menu-trigger-width)]" sideOffset={8}>
                <div className="space-y-0.5">
                  <DropdownMenuItem
                    onClick={() => setSelectedClientId("all")}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                      selectedClientId === "all"
                        ? "bg-gradient-to-r from-emerald-500/40 to-teal-500/40 text-foreground shadow-md"
                        : "text-foreground hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-teal-500/20"
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
                          ? "bg-gradient-to-r from-emerald-500/40 to-teal-500/40 text-foreground shadow-md"
                          : "text-foreground hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-teal-500/20"
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

      <main className="container mx-auto px-4 pt-24 pb-8 space-y-6">
        {/* Client Name Header - показується тільки при виборі конкретного клієнта */}
        {selectedClientId !== "all" && (
          <div className="glass-effect rounded-2xl p-6 shadow-xl text-center">
            <h1 className="text-2xl font-bold text-foreground">{getClientLabel(selectedClientId)}</h1>
          </div>
        )}

        {/* Statistics Cards - Unified 4-card grid with elevated design */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-white/20 dark:border-gray-800/50">
          <div className="grid grid-cols-2 gap-3">
          {/* PRIMARY CARDS - Main Information */}

          {/* Total Earned */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 p-4 shadow-md border border-border/50 transition-smooth hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 border border-blue-200 dark:border-blue-800">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Зароблено</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold text-black dark:text-white">{Math.round(stats.totalEarned)}</p>
                  <p className="text-sm font-semibold text-black dark:text-white">€</p>
                </div>
              </div>
            </div>
          </div>

          {/* Total Hours */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 p-4 shadow-md border border-border/50 transition-smooth hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 border border-purple-200 dark:border-purple-800">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Години</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold text-black dark:text-white">{stats.totalHours}</p>
                  <p className="text-sm font-semibold text-black dark:text-white">год</p>
                </div>
              </div>
            </div>
          </div>

          {/* SECONDARY CARDS - Less prominent styling */}

          {/* Paid Amount */}
          <div className={`relative overflow-hidden rounded-2xl p-4 shadow-sm transition-smooth hover:shadow-md ${
            stats.totalRemaining === 0 && stats.totalEarned > 0
              ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border border-green-200/60 dark:border-green-800/50"
              : "bg-gray-50/60 dark:bg-gray-800/30 border border-gray-200/50 dark:border-gray-700/50"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                stats.totalRemaining === 0 && stats.totalEarned > 0
                  ? "bg-success/25 dark:bg-success/30 border border-success/50 dark:border-success/60"
                  : "bg-success/15 dark:bg-success/20 border border-success/30 dark:border-success/40"
              }`}>
                <DollarSign className="w-5 h-5 text-success dark:text-success" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-medium mb-0.5 ${
                  stats.totalRemaining === 0 && stats.totalEarned > 0
                    ? "text-success/80 dark:text-success/70"
                    : "text-gray-500 dark:text-gray-400"
                }`}>Сплачено</p>
                <div className="flex items-baseline gap-1">
                  <p className={`text-xl font-bold ${
                    stats.totalRemaining === 0 && stats.totalEarned > 0
                      ? "text-success dark:text-success"
                      : "text-gray-700 dark:text-gray-200"
                  }`}>{Math.round(stats.totalPaid)}</p>
                  <p className={`text-sm font-semibold ${
                    stats.totalRemaining === 0 && stats.totalEarned > 0
                      ? "text-success dark:text-success"
                      : "text-gray-700 dark:text-gray-200"
                  }`}>€</p>
                </div>
              </div>
            </div>
          </div>

          {/* Remaining Amount */}
          <div className="relative overflow-hidden rounded-2xl bg-gray-50/60 dark:bg-gray-800/30 p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-smooth hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/15 dark:bg-warning/20 flex items-center justify-center flex-shrink-0 border border-warning/30 dark:border-warning/40">
                <DollarSign className="w-5 h-5 text-warning dark:text-warning" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Залишок</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold text-gray-700 dark:text-gray-200">{Math.round(stats.totalRemaining)}</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">€</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Debts Breakdown - тільки для всіх клієнтів */}
        {selectedClientId === "all" && debtsBreakdown.length > 0 && (
          <div className="glass-card rounded-2xl p-6 shadow-md border border-border transition-smooth hover:shadow-lg">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center border border-warning/20">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Борги по клієнтах</h2>
            </div>
            <div className="space-y-2.5">
              {debtsBreakdown.map((debt, index) => (
                <div key={index} className="flex items-center justify-between p-3.5 bg-warning/5 rounded-xl border border-warning/10 transition-smooth hover:bg-warning/10 hover:border-warning/20">
                  <span className="font-semibold text-foreground text-sm">{debt.name}</span>
                  <span className="font-bold text-warning text-base">{Math.round(debt.remaining)}€</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client Leaderboard - тільки для всіх клієнтів */}
        {selectedClientId === "all" && clientLeaderboard.length > 0 && (
          <div className="glass-card rounded-2xl p-6 shadow-md border border-border transition-smooth hover:shadow-lg">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Топ клієнтів</h2>
            </div>
            <div className="space-y-2.5">
              {clientLeaderboard.slice(0, 5).map((client, index) => (
                <div key={index} className="flex items-center justify-between p-3.5 bg-muted/20 rounded-xl border border-border/50 transition-smooth hover:bg-muted/30 hover:shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center font-bold text-primary text-sm border border-primary/20">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-foreground text-sm">{client.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground font-medium">{client.hours} год</p>
                    <p className="font-bold text-success text-base min-w-[60px] text-right">{Math.round(client.earned)}€</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Gradient fade effect for back button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none h-40">
        {/* Плавний градієнт розмиття - від сильного до відсутнього */}
        <div
          className="absolute inset-0 backdrop-blur-xl"
          style={{
            maskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)'
          }}
        ></div>

        {/* Градієнтний фон */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 via-40% to-transparent"></div>
      </div>

      <button
        onClick={() => navigate("/")}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 px-8 py-4 rounded-full shadow-md hover:shadow-lg transition-all backdrop-blur-sm border border-blue-200/60 pointer-events-auto"
      >
        <div className="flex items-center gap-2">
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span className="font-semibold text-base">Назад</span>
        </div>
      </button>
    </div>
  );
};

export default Dashboard;
