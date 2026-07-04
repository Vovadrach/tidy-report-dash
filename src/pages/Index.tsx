import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { Report, WorkDay, PaymentStatus } from "@/types/report";
import { Clock, CheckCircle as CheckCircle2, XCircle, WarningCircle as AlertCircle, CalendarBlank as Calendar, CircleNotch as Loader2, CurrencyEur as Euro, CaretLeft as ChevronLeft, CaretRight as ChevronRight, X, ArrowCounterClockwise as Undo2, ArrowClockwise as Redo2, CaretDown as ChevronDown } from "@phosphor-icons/react";
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
    <div className="min-h-screen bg-background">
      {/* Month Navigator */}
      <div className="fixed top-0 left-0 right-0 z-40 app-bar" data-no-swipe>
        <div className="container mx-auto px-4 py-3">
          {/* Navigation Controls */}
          <div className="flex items-center justify-between mb-3">
            {!isCustomPeriodMode ? (
              <button
                onClick={goToPreviousMonth}
                className="p-2.5 rounded-full text-primary hover:bg-primary/10 transition-all active:scale-90"
                aria-label="Попередній місяць"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.75]" />
              </button>
            ) : (
              <div className="w-10"></div>
            )}

            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleOpenDatePicker}
                className="px-5 py-1.5 rounded-full hover:bg-primary/10 transition-all active:scale-95 cursor-pointer"
              >
                <span className="num-display text-[1.45rem] text-foreground">
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
                className="p-2.5 rounded-full text-primary hover:bg-primary/10 transition-all active:scale-90"
                aria-label="Наступний місяць"
              >
                <ChevronRight className="w-5 h-5 stroke-[2.75]" />
              </button>
            ) : (
              <div className="w-10"></div>
            )}
          </div>

          {/* Month Statistics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="stat-tile stat-tile-time">
              <div className="icon-badge icon-badge-time">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="micro-label">Годин</p>
                <p className="num-display text-[1.4rem] text-foreground leading-tight">{decimalToHours(monthStats.totalHours)}</p>
              </div>
            </div>
            <div className="stat-tile stat-tile-money">
              <div className="icon-badge icon-badge-money">
                <Euro className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="micro-label">Заробіток</p>
                <p className="num-display text-[1.4rem] text-foreground leading-tight">{Math.round(monthStats.totalEarned)}€</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-[152px] pb-dock space-y-5">
        {/* Return to Current Month Button */}
        {!isCurrentMonth && !isCustomPeriodMode && (
          <div className="flex justify-center mb-4">
            <button
              onClick={goToCurrentMonth}
              className="bg-primary/10 hover:bg-primary/15 px-4 py-2 rounded-full flex items-center gap-2 transition-colors active:scale-95"
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
            <div className="icon-badge icon-badge-money w-16 h-16 rounded-2xl mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">Немає записів</p>
            <p className="text-muted-foreground text-sm">в цьому місяці</p>
          </div>
        ) : (
          groupedByDay.map(({ date: dateKey, days: daysData }, groupIndex) => {
            const date = new Date(dateKey);
            const dayNames = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
            const dayName = dayNames[date.getDay()];
            const dayNumber = date.getDate();

            const isToday = new Date().toISOString().split('T')[0] === dateKey;

            return (
              <div key={dateKey} className="space-y-2" data-no-swipe>
                {/* Day Header - Sticky (Telegram style) */}
                <div
                  className="sticky flex flex-col items-center gap-1.5 py-1.5"
                  style={{
                    top: '152px',
                    zIndex: 30
                  }}
                >
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full shadow-sm backdrop-blur-xl border ${
                    isToday
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-card/95 border-border'
                  }`}>
                    <Calendar className={`w-3.5 h-3.5 ${
                      isToday ? 'text-primary' : daysData.length === 0 ? 'text-muted-foreground' : 'text-foreground'
                    }`} />
                    <span className={`text-xs font-bold tabular-nums ${
                      isToday ? 'text-primary' : daysData.length === 0 ? 'text-muted-foreground' : 'text-foreground'
                    }`}>
                      {dayNumber}
                    </span>
                    <span className={`text-xs font-semibold ${
                      isToday ? 'text-primary' : daysData.length === 0 ? 'text-muted-foreground' : 'text-foreground'
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
                  <div className="space-y-2">
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
                            className={`flex-1 rounded-xl p-2 sm:p-2.5 cursor-pointer ${
                              day.is_planned
                                ? 'bg-warning/8 border-2 border-dashed border-warning/45 rounded-xl surface-card-hover'
                                : `surface-card surface-card-hover ${dayIndex === daysData.length - 1 ? 'shadow-md' : ''}`
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                              {/* Ліва частина: індикатор + ім'я */}
                              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                                {!day.is_planned && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <button className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 ${
                                        day.paymentStatus === 'paid' ? 'bg-success/20 hover:bg-success/30' :
                                        day.paymentStatus === 'partial' ? 'bg-warning/20 hover:bg-warning/30' : 'bg-destructive/20 hover:bg-destructive/30'
                                      }`}>
                                        <span className={`text-[10px] sm:text-xs font-bold ${
                                          day.paymentStatus === 'paid' ? 'text-success' :
                                          day.paymentStatus === 'partial' ? 'text-warning' : 'text-destructive'
                                        }`}>
                                          {day.paymentStatus === 'paid' ? '✓' :
                                           day.paymentStatus === 'partial' ? '◐' : '○'}
                                        </span>
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="z-[100] rounded-xl p-1.5 min-w-[150px] shadow-lg">
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
                                <h3 className={`text-xs sm:text-sm font-bold truncate ${
                                  day.paymentStatus === 'paid' ? 'text-success' : 'text-foreground'
                                }`}>
                                  {day.clientName}
                                </h3>

                                {/* Worker badge - inline if single worker */}
                                {!day.is_planned && day.assignments && day.assignments.length === 1 && (
                                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground ml-1">
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: day.assignments[0].worker?.color || '#3b82f6' }}
                                    />
                                    <span className="text-[10px]">{day.assignments[0].worker?.name}</span>
                                  </div>
                                )}
                              </div>

                              {/* Права частина: години + сума АБО бейдж "Заплановано" */}
                              {day.is_planned ? (
                                <div className="chip chip-due rounded-full">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold">Заплановано</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <div className="chip chip-time min-w-[55px]">
                                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>
                                      {decimalToHours(day.workerHours !== undefined ? day.workerHours : day.hours)}
                                    </span>
                                  </div>

                                  <div className="chip chip-money min-w-[55px]">
                                    <Euro className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>
                                      {Math.round(day.workerAmount !== undefined ? day.workerAmount : day.amount)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {day.note && (
                              <p className="text-xs text-muted-foreground mt-2 truncate">📝 {day.note}</p>
                            )}

                            {/* Worker badges - below if multiple workers */}
                            {day.assignments && day.assignments.length > 1 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {day.assignments.map(assignment => (
                                  <div
                                    key={assignment.id}
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground"
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: assignment.worker?.color || '#3b82f6' }}
                                    />
                                    <span className="text-[10px]">{assignment.worker?.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Inline Partial Payment Input - appears beside the card */}
                        {partialPaymentDayId === day.id && (
                          <div className="mt-2 surface-card p-3 border-warning/40" onClick={(e) => e.stopPropagation()}>
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
                                className="h-9 px-4 rounded-full text-sm font-bold bg-warning hover:bg-warning/90 text-warning-foreground transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setPartialPaymentDayId(null);
                                  setPartialPaymentAmount("");
                                }}
                                className="h-9 px-4 rounded-full text-sm font-bold bg-secondary hover:bg-muted text-secondary-foreground transition-colors active:scale-95"
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
        <DialogContent className="w-[calc(100%-3rem)] max-w-md rounded-3xl left-1/2 -translate-x-1/2 shadow-xl">
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
                    <button className={`flex-1 px-4 py-3 rounded-xl border shadow-xs hover:shadow-sm transition-all active:scale-[0.98] ${
                      userSelectedYear
                        ? "bg-primary/10 border-primary/40"
                        : "bg-card border-border"
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold text-sm ${userSelectedYear ? "text-primary" : "text-foreground"}`}>
                          {selectedYear ?? "Рік"}
                        </span>
                        <ChevronDown className="w-5 h-5 text-primary stroke-[2.5]" />
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-[110] rounded-xl p-1.5 min-w-[140px] max-h-[300px] overflow-y-auto shadow-lg">
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

                {/* Month Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`flex-1 px-4 py-3 rounded-xl border shadow-xs hover:shadow-sm transition-all active:scale-[0.98] ${
                      userSelectedMonth
                        ? "bg-accent/12 border-accent/40"
                        : "bg-card border-border"
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold text-sm ${userSelectedMonth ? "text-accent" : "text-foreground"}`}>
                          {selectedMonth !== null
                            ? ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"][selectedMonth]
                            : "Місяць"}
                        </span>
                        <ChevronDown className="w-5 h-5 text-accent stroke-[2.5]" />
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-[110] rounded-xl p-1.5 min-w-[140px] max-h-[300px] overflow-y-auto shadow-lg">
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
                            ? "bg-accent/15 text-accent"
                            : "text-foreground hover:bg-accent/8"
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
                              ? "bg-accent/15 text-accent"
                              : "text-foreground hover:bg-accent/8"
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
                className="flex-1 h-10 rounded-xl"
              >
                Скасувати
              </Button>
              <Button
                onClick={handleApplyCustomPeriod}
                disabled={!tempStartDate || !tempEndDate}
                className="flex-1 h-10 rounded-xl"
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
