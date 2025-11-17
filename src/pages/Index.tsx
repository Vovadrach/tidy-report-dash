import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { Report, WorkDay, PaymentStatus } from "@/types/report";
import { Clock, TrendingUp, CheckCircle2, XCircle, AlertCircle, Calendar, Loader2, Euro, ChevronLeft, ChevronRight, X, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { WorkerSelector } from "@/components/WorkerSelector";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useWorker } from "@/contexts/WorkerContext";

// Helper functions for month calculation
// Format date as YYYY-MM-DD using local time (not UTC)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFirstDayOfMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month, 1, 0, 0, 0, 0);
};

const getLastDayOfMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
};

const formatMonthYear = (date: Date) => {
  const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];

  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${month} ${year}`;
};

// Helper function to convert decimal hours to hours:minutes format
const decimalToHours = (decimal: number): string => {
  if (!decimal) return "0";
  const totalMinutes = Math.round(decimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}` : `${hours}:${minutes.toString().padStart(2, '0')}`;
};

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedWorkerId, setSelectedWorkerId } = useWorker();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Month navigation state - always start with current month
  const [currentMonth, setCurrentMonth] = useState<Date>(() => getFirstDayOfMonth(new Date()));

  // Custom period state
  const [isCustomPeriodMode, setIsCustomPeriodMode] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [userSelectedYear, setUserSelectedYear] = useState(false);
  const [userSelectedMonth, setUserSelectedMonth] = useState(false);
  const [userManuallyEditedStartDate, setUserManuallyEditedStartDate] = useState(false);
  const [userManuallyEditedEndDate, setUserManuallyEditedEndDate] = useState(false);

  // Partial payment inline state
  const [partialPaymentDayId, setPartialPaymentDayId] = useState<string | null>(null);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState("");

  // Reset to current month when returning to this page
  useEffect(() => {
    setCurrentMonth(getFirstDayOfMonth(new Date()));
  }, [location.pathname]);

  // Load reports
  useEffect(() => {
    loadReports();
  }, []);

  // Reload on window focus
  useEffect(() => {
    const handleFocus = () => {
      loadReports();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getReports();
      setReports(data);
    } catch (error) {
      const errorMessage = 'Помилка завантаження звітів';
      toast.error(errorMessage);
      setError(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (dayId: string, newStatus: PaymentStatus, e: React.MouseEvent, currentStatus?: string, day?: WorkDay & { workerAmount?: number }) => {
    e.stopPropagation(); // Prevent navigation to details page

    // If switching to partial, show inline input
    if (newStatus === "partial") {
      setPartialPaymentDayId(dayId);
      setPartialPaymentAmount("");

      // Reset day_paid_amount to 0 ONLY when switching from "paid" to "partial"
      // If already "partial", keep the existing day_paid_amount
      if (currentStatus === "paid") {
        try {
          await api.updateWorkDay(dayId, {
            payment_status: "partial",
            day_paid_amount: 0,
          });
          await loadReports();
        } catch (error) {
          console.error('Error updating status:', error);
        }
      }
      return;
    }

    // Hide inline input if changing from partial to paid/unpaid
    if (partialPaymentDayId === dayId) {
      setPartialPaymentDayId(null);
      setPartialPaymentAmount("");
    }

    try {
      // For specific worker, when marking as paid, add worker's share to day_paid_amount
      if (selectedWorkerId !== 'all' && newStatus === "paid" && day && day.workerAmount) {
        const currentPaid = day.day_paid_amount || 0;
        const newPaidAmount = currentPaid + day.workerAmount;
        const totalAmount = day.amount;

        // Determine new status based on total paid
        const finalStatus: PaymentStatus = newPaidAmount >= totalAmount ? "paid" : "partial";

        await api.updateWorkDay(dayId, {
          payment_status: finalStatus,
          day_paid_amount: Math.min(newPaidAmount, totalAmount),
        });
      } else {
        // For "all" workers view or unpaid status, update normally
        await api.updateWorkDay(dayId, {
          payment_status: newStatus,
          day_paid_amount: newStatus === "unpaid" ? 0 : undefined,
        });
      }

      // Reload reports to reflect changes
      await loadReports();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleApplyPartialPayment = async (day: WorkDay & { reportId: string; clientName: string; paymentStatus: string }) => {
    if (!partialPaymentAmount || parseFloat(partialPaymentAmount) <= 0) {
      toast.error("Введіть коректну суму");
      return;
    }

    const partial = parseFloat(partialPaymentAmount);
    const currentPaid = day.day_paid_amount || 0;
    const newTotal = currentPaid + partial;

    if (newTotal > day.amount) {
      toast.error("Сума перевищує загальну вартість");
      return;
    }

    try {
      const newStatus: PaymentStatus = newTotal >= day.amount ? "paid" : "partial";

      await api.updateWorkDay(day.id, {
        payment_status: newStatus,
        day_paid_amount: newTotal,
      });

      await loadReports();
      setPartialPaymentDayId(null);
      setPartialPaymentAmount("");
      toast.success("Оплату додано", { duration: 2000 });
    } catch (error) {
      toast.error("Помилка додавання оплати");
      console.error(error);
    }
  };

  // Month navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return getFirstDayOfMonth(newDate);
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return getFirstDayOfMonth(newDate);
    });
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(getFirstDayOfMonth(new Date()));
    setIsCustomPeriodMode(false);
    setCustomStartDate(null);
    setCustomEndDate(null);
  };

  // Custom period handlers
  const handleOpenDatePicker = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    setIsDatePickerOpen(true);
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
    setUserSelectedYear(false);
    setUserSelectedMonth(false);
    setUserManuallyEditedStartDate(false);
    setUserManuallyEditedEndDate(false);
    // tempStartDate and tempEndDate will be set by useEffect when selectedYear/selectedMonth change
  };

  const handleApplyCustomPeriod = () => {
    if (!tempStartDate || !tempEndDate) {
      toast.error("Оберіть обидві дати");
      return;
    }

    const start = new Date(tempStartDate);
    const end = new Date(tempEndDate);

    if (start > end) {
      toast.error("Початкова дата повинна бути раніше кінцевої");
      return;
    }

    setCustomStartDate(start);
    setCustomEndDate(end);
    setIsCustomPeriodMode(true);
    setIsDatePickerOpen(false);
    toast.success("Період застосовано", { duration: 2000 });
  };

  // Auto-fill dates when year or month changes
  useEffect(() => {
    if (selectedYear !== null && (userSelectedYear || userSelectedMonth)) {
      let start: Date;
      let end: Date;

      if (selectedMonth !== null) {
        // Specific month selected
        start = new Date(selectedYear, selectedMonth, 1);
        end = new Date(selectedYear, selectedMonth + 1, 0); // Last day of month
      } else {
        // Only year selected - whole year
        start = new Date(selectedYear, 0, 1);
        end = new Date(selectedYear, 11, 31);
      }

      // Format dates for input fields
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      setTempStartDate(formatDate(start));
      setTempEndDate(formatDate(end));
    }
  }, [selectedYear, selectedMonth, userSelectedYear, userSelectedMonth]);

  // Auto-detect year and month from manual date changes
  useEffect(() => {
    if (tempStartDate && tempEndDate && (userManuallyEditedStartDate || userManuallyEditedEndDate)) {
      const start = new Date(tempStartDate);
      const end = new Date(tempEndDate);

      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      const startMonth = start.getMonth();
      const endMonth = end.getMonth();

      // Check if same year
      if (startYear === endYear) {
        setSelectedYear(startYear);
        setUserSelectedYear(true);

        // Check if same month
        if (startMonth === endMonth) {
          setSelectedMonth(startMonth);
          setUserSelectedMonth(true);
        } else {
          setSelectedMonth(null);
          setUserSelectedMonth(true); // Mark as selected to show highlight
        }
      } else {
        // Different years - just mark as having dates
        setUserSelectedYear(true);
        setUserSelectedMonth(true);
      }
    }
  }, [tempStartDate, tempEndDate, userManuallyEditedStartDate, userManuallyEditedEndDate]);

  const handleClearCustomPeriod = () => {
    setIsCustomPeriodMode(false);
    setCustomStartDate(null);
    setCustomEndDate(null);
    setCurrentMonth(getFirstDayOfMonth(new Date()));
  };

  // Check if current month is selected
  const isCurrentMonth = useMemo(() => {
    if (isCustomPeriodMode) return false;
    const today = getFirstDayOfMonth(new Date());
    return currentMonth.getTime() === today.getTime();
  }, [currentMonth, isCustomPeriodMode]);

  // Helper function to get worker-specific data from work day
  const getWorkerDataFromWorkDay = (day: WorkDay, workerId: string | 'all') => {
    if (workerId === 'all') {
      return {
        amount: day.amount,
        hours: day.hours
      };
    }

    // Find assignment for this worker
    const assignment = day.assignments?.find(a =>
      (a.worker_id === workerId || a.workerId === workerId)
    );

    if (assignment) {
      return {
        amount: assignment.amount,
        hours: assignment.hours
      };
    }

    return {
      amount: 0,
      hours: 0
    };
  };

  // Filter work days for current month or custom period
  const monthWorkDays = useMemo(() => {
    let periodStart: Date;
    let periodEnd: Date;

    if (isCustomPeriodMode && customStartDate && customEndDate) {
      periodStart = customStartDate;
      periodEnd = customEndDate;
    } else {
      periodStart = getFirstDayOfMonth(currentMonth);
      periodEnd = getLastDayOfMonth(currentMonth);
    }

    const days: Array<WorkDay & { reportId: string; clientId: string; clientName: string; paymentStatus: string; workerAmount?: number; workerHours?: number }> = [];

    reports.forEach(report => {
      report.workDays.forEach(day => {
        const dayDate = new Date(day.date);
        if (dayDate >= periodStart && dayDate <= periodEnd) {
          // Filter by worker if selected
          if (selectedWorkerId === 'all') {
            // Show all work days
            days.push({
              ...day,
              reportId: report.id,
              clientId: report.clientId || report.client_id || '',
              clientName: report.clientName || report.client_name || 'Без імені',
              paymentStatus: day.paymentStatus || day.payment_status || 'unpaid'
            });
          } else {
            // Only show work days assigned to selected worker
            const hasAssignment = day.assignments?.some(a => a.worker_id === selectedWorkerId || a.workerId === selectedWorkerId);
            if (hasAssignment) {
              const workerData = getWorkerDataFromWorkDay(day, selectedWorkerId);
              days.push({
                ...day,
                reportId: report.id,
                clientId: report.clientId || report.client_id || '',
                clientName: report.clientName || report.client_name || 'Без імені',
                paymentStatus: day.paymentStatus || day.payment_status || 'unpaid',
                workerAmount: workerData.amount,
                workerHours: workerData.hours
              });
            }
          }
        }
      });
    });

    return days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reports, currentMonth, isCustomPeriodMode, customStartDate, customEndDate, selectedWorkerId]);

  // Group work days by date (latest at top, earliest at bottom)
  const groupedByDay = useMemo(() => {
    const daysMap = new Map<string, Array<WorkDay & { reportId: string; clientName: string; paymentStatus: string }>>();

    // Add all work days to the map
    monthWorkDays.forEach(day => {
      if (!daysMap.has(day.date)) {
        daysMap.set(day.date, []);
      }
      daysMap.get(day.date)!.push(day);
    });

    // Add today if not already in the map AND if it's in the current period
    const todayKey = formatLocalDate(new Date());
    const today = new Date(todayKey);

    let periodStart: Date;
    let periodEnd: Date;

    if (isCustomPeriodMode && customStartDate && customEndDate) {
      periodStart = customStartDate;
      periodEnd = customEndDate;
    } else {
      periodStart = getFirstDayOfMonth(currentMonth);
      periodEnd = getLastDayOfMonth(currentMonth);
    }

    // Only add today if it's within the current viewing period
    if (today >= periodStart && today <= periodEnd && !daysMap.has(todayKey)) {
      daysMap.set(todayKey, []);
    }

    // Convert to array and sort by date (latest first)
    const daysList = Array.from(daysMap.entries())
      .map(([date, days]) => ({ date, days }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return daysList;
  }, [monthWorkDays, currentMonth, isCustomPeriodMode, customStartDate, customEndDate]);

  // Month statistics
  const monthStats = useMemo(() => {
    let totalMinutes = 0;
    let totalEarned = 0;
    let totalPaid = 0;

    monthWorkDays.forEach(day => {
      // Use worker-specific data if available
      const dayHours = day.workerHours !== undefined ? day.workerHours : day.hours;
      const dayAmount = day.workerAmount !== undefined ? day.workerAmount : day.amount;

      totalMinutes += Math.round(dayHours * 60);
      totalEarned += dayAmount;

      const status = day.paymentStatus;
      if (status === 'paid') {
        totalPaid += dayAmount;
      } else if (status === 'partial') {
        // For partial payment, calculate worker's share
        if (selectedWorkerId !== 'all' && day.workerAmount !== undefined && day.amount > 0) {
          // Calculate worker's share of paid amount proportionally
          const workerShare = (day.workerAmount / day.amount) * (day.day_paid_amount || 0);
          totalPaid += workerShare;
        } else {
          totalPaid += day.day_paid_amount || 0;
        }
      }
    });

    const totalHours = totalMinutes / 60;
    const paidPercentage = totalEarned > 0 ? Math.round((totalPaid / totalEarned) * 100) : 0;

    return {
      totalHours,
      totalEarned,
      totalPaid,
      totalRemaining: totalEarned - totalPaid,
      paidPercentage
    };
  }, [monthWorkDays, selectedWorkerId]);

  // Function to determine payment color based on status
  const getPaymentColor = (day: WorkDay & { paymentStatus: string }) => {
    const status = day.paymentStatus;
    switch (status) {
      case "paid":
        return "text-success";
      case "partial":
        return "text-warning";
      case "unpaid":
        return "text-destructive";
      default:
        return "text-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground text-lg mb-4">{error}</p>
          <Button onClick={loadReports}>Спробувати знову</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background pb-32 pt-4"
    >
      {/* Month Navigator */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border-b border-white/10 shadow-[0_2px_16px_0_rgba(31,38,135,0.1)]" data-no-swipe>
        <div className="container mx-auto px-4 py-3">
          {/* Navigation Controls */}
          <div className="flex items-center justify-between mb-3">
            {!isCustomPeriodMode ? (
              <button
                onClick={goToPreviousMonth}
                className="p-2.5 rounded-xl hover:bg-primary/10 transition-all active:scale-95"
                aria-label="Попередній місяць"
              >
                <ChevronLeft className="w-5 h-5 text-primary stroke-[3]" />
              </button>
            ) : (
              <div className="w-10"></div>
            )}

            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleOpenDatePicker}
                className="px-5 py-2 rounded-2xl hover:bg-primary/10 transition-all active:scale-95 cursor-pointer"
              >
                <span className="text-base font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {isCustomPeriodMode && customStartDate && customEndDate
                    ? `${customStartDate.toLocaleDateString("uk-UA", { day: 'numeric', month: 'short' })} - ${customEndDate.toLocaleDateString("uk-UA", { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : formatMonthYear(currentMonth)}
                </span>
              </button>
              {isCustomPeriodMode && (
                <button
                  onClick={handleClearCustomPeriod}
                  className="text-xs text-destructive hover:underline font-semibold flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Скинути період
                </button>
              )}
            </div>

            {!isCustomPeriodMode ? (
              <button
                onClick={goToNextMonth}
                className="p-2.5 rounded-xl hover:bg-primary/10 transition-all active:scale-95"
                aria-label="Наступний місяць"
              >
                <ChevronRight className="w-5 h-5 text-primary stroke-[3]" />
              </button>
            ) : (
              <div className="w-10"></div>
            )}
          </div>

          {/* Month Statistics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3.5 text-center border border-purple-200/60">
              <p className="text-sm text-purple-700 font-medium">Годин</p>
              <p className="text-xl font-bold text-purple-900">{decimalToHours(monthStats.totalHours)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3.5 text-center border border-blue-200/60">
              <p className="text-sm text-blue-700 font-medium">Заробіток</p>
              <p className="text-xl font-bold text-blue-900">{Math.round(monthStats.totalEarned)}€</p>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-36 pb-6 space-y-5">
        {/* Return to Current Month Button */}
        {!isCurrentMonth && !isCustomPeriodMode && (
          <div className="flex justify-center mb-4">
            <button
              onClick={goToCurrentMonth}
              className="bg-primary/10 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              {currentMonth < getFirstDayOfMonth(new Date()) ? (
                <>
                  <span className="text-sm font-semibold text-primary">Поточний місяць</span>
                  <Redo2 className="w-4 h-4 text-primary" />
                </>
              ) : (
                <>
                  <Undo2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">Поточний місяць</span>
                </>
              )}
            </button>
          </div>
        )}

        {groupedByDay.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold text-foreground mb-2">Немає записів</p>
            <p className="text-muted-foreground text-sm">в цьому місяці</p>
          </div>
        ) : (
          groupedByDay.map(({ date: dateKey, days: daysData }) => {
            const date = new Date(dateKey);
            const dayNames = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
            const dayName = dayNames[date.getDay()];
            const dayNumber = date.getDate();

            const isToday = new Date().toISOString().split('T')[0] === dateKey;

            return (
              <div key={dateKey} className="space-y-2" data-no-swipe>
                {/* Day Header - Sticky (Telegram style) */}
                <div className="sticky top-[140px] z-30 flex flex-col items-center gap-2 py-1.5">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-sm ${
                    isToday
                      ? 'bg-gradient-to-r from-red-500/25 to-rose-500/25 backdrop-blur-xl border border-red-400/40 dark:border-red-500/40'
                      : 'bg-card/95 backdrop-blur-xl border border-border/50'
                  }`}>
                    <Calendar className={`w-3.5 h-3.5 ${
                      isToday ? 'text-red-600 dark:text-red-400' : daysData.length === 0 ? 'text-muted-foreground' : 'text-foreground'
                    }`} />
                    <span className={`text-xs font-semibold ${
                      isToday ? 'text-red-700 dark:text-red-300' : daysData.length === 0 ? 'text-muted-foreground' : 'text-foreground'
                    }`}>
                      {dayNumber}
                    </span>
                    <span className={`text-xs font-medium ${
                      isToday ? 'text-red-700 dark:text-red-300' : daysData.length === 0 ? 'text-muted-foreground' : 'text-foreground'
                    }`}>
                      {dayName}
                      {isToday && ' (Сьогодні)'}
                    </span>
                  </div>

                  {/* Info text - only for today when no records */}
                  {isToday && daysData.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      Записів ще немає
                    </span>
                  )}
                </div>

                {/* Work Days for this date */}
                {daysData.length > 0 && (
                  <div className="space-y-3">
                    {daysData.map((day, dayIndex) => (
                      <div key={`${day.reportId}-${day.id}`}>
                        <div className="flex gap-2">
                          <div
                            onClick={() => {
                              if (day.is_planned) {
                                // For planned work, open CreateReport with pre-filled data
                                navigate(`/create-report?clientId=${day.clientId}&date=${day.date}&workDayId=${day.id}&reportId=${day.reportId}`);
                              } else {
                                // For normal work, open WorkDayDetails
                                navigate(`/report/${day.reportId}/day/${day.id}`);
                              }
                            }}
                            className={`flex-1 rounded-xl p-3.5 sm:p-4 hover:shadow-lg transition-smooth cursor-pointer ${
                              day.is_planned
                                ? 'bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-dashed border-amber-400/70 dark:border-amber-500/70'
                                : `bg-card border border-border ${dayIndex === daysData.length - 1 ? 'shadow-[0_4px_16px_0_rgba(31,38,135,0.15)]' : 'shadow-sm'}`
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 sm:gap-3">
                              {/* Ліва частина: індикатор + ім'я */}
                              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                {!day.is_planned && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <button className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 ${
                                        day.paymentStatus === 'paid' ? 'bg-success/20 hover:bg-success/30' :
                                        day.paymentStatus === 'partial' ? 'bg-warning/20 hover:bg-warning/30' : 'bg-destructive/20 hover:bg-destructive/30'
                                      }`}>
                                        <span className={`text-sm sm:text-base font-bold ${
                                          day.paymentStatus === 'paid' ? 'text-success' :
                                          day.paymentStatus === 'partial' ? 'text-warning' : 'text-destructive'
                                        }`}>
                                          {day.paymentStatus === 'paid' ? '✓' :
                                           day.paymentStatus === 'partial' ? '◐' : '○'}
                                        </span>
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-card backdrop-blur-xl border border-border shadow-lg rounded-xl z-[100] p-1.5 min-w-[140px]">
                                      {/* Active status first */}
                                      {day.paymentStatus === 'paid' && (
                                        <DropdownMenuItem
                                          onClick={(e) => handleStatusChange(day.id, "paid", e, day.paymentStatus, day)}
                                          className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all bg-success/20 text-success"
                                        >
                                          <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                                          Оплачено
                                        </DropdownMenuItem>
                                      )}
                                      {day.paymentStatus === 'partial' && (
                                        <DropdownMenuItem
                                          onClick={(e) => handleStatusChange(day.id, "partial", e, day.paymentStatus, day)}
                                          className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all bg-warning/20 text-warning"
                                        >
                                          <AlertCircle className="w-4 h-4 mr-2 inline" />
                                          Частково
                                        </DropdownMenuItem>
                                      )}
                                      {day.paymentStatus === 'unpaid' && (
                                        <DropdownMenuItem
                                          onClick={(e) => handleStatusChange(day.id, "unpaid", e, day.paymentStatus, day)}
                                          className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all bg-destructive/20 text-destructive"
                                        >
                                          <XCircle className="w-4 h-4 mr-2 inline" />
                                          Не оплачено
                                        </DropdownMenuItem>
                                      )}

                                      {/* Other statuses */}
                                      {day.paymentStatus !== 'paid' && (
                                        <DropdownMenuItem
                                          onClick={(e) => handleStatusChange(day.id, "paid", e, day.paymentStatus, day)}
                                          className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all text-foreground hover:bg-success/10"
                                        >
                                          <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                                          Оплачено
                                        </DropdownMenuItem>
                                      )}
                                      {day.paymentStatus !== 'partial' && (
                                        <DropdownMenuItem
                                          onClick={(e) => handleStatusChange(day.id, "partial", e, day.paymentStatus, day)}
                                          className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all text-foreground hover:bg-warning/10"
                                        >
                                          <AlertCircle className="w-4 h-4 mr-2 inline" />
                                          Частково
                                        </DropdownMenuItem>
                                      )}
                                      {day.paymentStatus !== 'unpaid' && (
                                        <DropdownMenuItem
                                          onClick={(e) => handleStatusChange(day.id, "unpaid", e, day.paymentStatus, day)}
                                          className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all text-foreground hover:bg-destructive/10"
                                        >
                                          <XCircle className="w-4 h-4 mr-2 inline" />
                                          Не оплачено
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                <h3 className={`text-sm sm:text-base font-semibold truncate ${
                                  day.paymentStatus === 'paid' ? 'text-success' : 'text-foreground'
                                }`}>
                                  {day.clientName}
                                </h3>

                                {/* Worker badge - inline if single worker */}
                                {!day.is_planned && day.assignments && day.assignments.length === 1 && (
                                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 ml-2">
                                    <div
                                      className="w-2.5 h-2.5 rounded-full"
                                      style={{ backgroundColor: day.assignments[0].worker?.color || '#3b82f6' }}
                                    />
                                    <span className="text-xs">{day.assignments[0].worker?.name}</span>
                                  </div>
                                )}
                              </div>

                              {/* Права частина: години + сума АБО бейдж "Заплановано" */}
                              {day.is_planned ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                                  <Calendar className="w-4 h-4" />
                                  <span className="text-xs font-semibold">Заплановано</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                  <div className="bg-purple-50 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 min-w-[70px] sm:min-w-[80px]">
                                    <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-purple-600 flex-shrink-0" />
                                    <span className="text-sm sm:text-base font-bold text-foreground tabular-nums">
                                      {decimalToHours(day.workerHours !== undefined ? day.workerHours : day.hours)}
                                    </span>
                                  </div>

                                  <div className="bg-blue-50 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 min-w-[70px] sm:min-w-[80px]">
                                    <Euro className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-600 flex-shrink-0" />
                                    <span className="text-sm sm:text-base font-bold text-foreground tabular-nums">
                                      {Math.round(day.workerAmount !== undefined ? day.workerAmount : day.amount)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {day.note && (
                              <p className="text-sm text-muted-foreground mt-2.5 truncate">📝 {day.note}</p>
                            )}
                            
                            {/* Worker badges - below if multiple workers */}
                            {day.assignments && day.assignments.length > 1 && (
                              <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {day.assignments.map(assignment => (
                                  <div 
                                    key={assignment.id}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800"
                                  >
                                    <div 
                                      className="w-2.5 h-2.5 rounded-full" 
                                      style={{ backgroundColor: assignment.worker?.color || '#3b82f6' }}
                                    />
                                    <span className="text-xs">{assignment.worker?.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Inline Partial Payment Input - appears beside the card */}
                        {partialPaymentDayId === day.id && (
                          <div className="mt-2 bg-card rounded-lg p-3 border border-orange-300 dark:border-orange-700 shadow-sm" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 items-start">
                              <div className="flex-1">
                                <Input
                                  type="number"
                                  value={partialPaymentAmount}
                                  onChange={(e) => setPartialPaymentAmount(e.target.value)}
                                  placeholder={`Залишок: ${Math.round((day.workerAmount !== undefined ? day.workerAmount : day.amount) - (day.day_paid_amount || 0))}€`}
                                  className="h-9 text-sm rounded-lg"
                                  autoFocus
                                />
                              </div>
                              <button
                                onClick={() => handleApplyPartialPayment(day)}
                                disabled={
                                  !partialPaymentAmount ||
                                  parseFloat(partialPaymentAmount) <= 0 ||
                                  (parseFloat(partialPaymentAmount) + (day.day_paid_amount || 0)) > (day.workerAmount !== undefined ? day.workerAmount : day.amount)
                                }
                                className="h-9 px-3 rounded-lg text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setPartialPaymentDayId(null);
                                  setPartialPaymentAmount("");
                                }}
                                className="h-9 px-3 rounded-lg text-sm font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Navigation */}
      <BottomNavigation />

      {/* Custom Period Dialog */}
      <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <DialogContent className="bg-card border border-border shadow-xl w-[calc(100%-3rem)] max-w-md rounded-2xl left-1/2 -translate-x-1/2">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Виберіть період</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Month and Year Selectors */}
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Швидкий вибір</Label>
              <div className="flex gap-2">
                {/* Year Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`flex-1 backdrop-blur-xl px-4 py-3 rounded-xl border shadow-sm hover:shadow-md transition-all ${
                      userSelectedYear
                        ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-blue-400/50 dark:border-blue-600/50"
                        : "bg-card border-border"
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold text-sm ${userSelectedYear ? "text-blue-700 dark:text-blue-300" : "text-foreground"}`}>
                          {selectedYear ?? "Рік"}
                        </span>
                        <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card backdrop-blur-xl border border-border shadow-lg rounded-lg z-[110] p-1.5 min-w-[140px] max-h-[300px] overflow-y-auto">
                    <div className="space-y-0.5">
                      {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
                        <DropdownMenuItem
                          key={year}
                          onClick={() => {
                            setSelectedYear(year);
                            setUserSelectedYear(true);
                            setUserManuallyEditedStartDate(false);
                            setUserManuallyEditedEndDate(false);
                          }}
                          className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
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

                {/* Month Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`flex-1 backdrop-blur-xl px-4 py-3 rounded-xl border shadow-sm hover:shadow-md transition-all ${
                      userSelectedMonth
                        ? "bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border-emerald-400/50 dark:border-emerald-600/50"
                        : "bg-card border-border"
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold text-sm ${userSelectedMonth ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"}`}>
                          {selectedMonth !== null
                            ? ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"][selectedMonth]
                            : "Місяць"}
                        </span>
                        <ChevronDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card backdrop-blur-xl border border-border shadow-lg rounded-lg z-[110] p-1.5 min-w-[140px] max-h-[300px] overflow-y-auto">
                    <div className="space-y-0.5">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedMonth(null);
                          setUserSelectedMonth(true);
                          setUserManuallyEditedStartDate(false);
                          setUserManuallyEditedEndDate(false);
                        }}
                        className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
                          selectedMonth === null
                            ? "bg-gradient-to-r from-emerald-500/40 to-teal-500/40 text-foreground"
                            : "text-foreground hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-teal-500/20"
                        }`}
                      >
                        Весь рік
                      </DropdownMenuItem>
                      {["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"].map((month, i) => (
                        <DropdownMenuItem
                          key={i}
                          onClick={() => {
                            setSelectedMonth(i);
                            setUserSelectedMonth(true);
                            setUserManuallyEditedStartDate(false);
                            setUserManuallyEditedEndDate(false);
                          }}
                          className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
                            selectedMonth === i
                              ? "bg-gradient-to-r from-emerald-500/40 to-teal-500/40 text-foreground"
                              : "text-foreground hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-teal-500/20"
                          }`}
                        >
                          {month}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => setIsDatePickerOpen(false)}
                variant="outline"
                className="flex-1 h-10 rounded-md"
              >
                Скасувати
              </Button>
              <Button
                onClick={handleApplyCustomPeriod}
                disabled={!tempStartDate || !tempEndDate}
                className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white rounded-md disabled:opacity-50"
              >
                Застосувати
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
