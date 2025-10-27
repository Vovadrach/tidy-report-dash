import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { Report, WorkDay, PaymentStatus } from "@/types/report";
import { Clock, TrendingUp, CheckCircle2, XCircle, AlertCircle, Calendar, Loader2, Euro, ChevronLeft, ChevronRight, X, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
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

// Helper functions for week calculation
// Format date as YYYY-MM-DD using local time (not UTC)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonday = (date: Date) => {
  // Use local date methods instead of ISO to avoid timezone issues
  const year = date.getFullYear();
  const month = date.getMonth();
  const dateNum = date.getDate();
  const day = date.getDay();

  // Calculate Monday
  const diff = day === 0 ? -6 : 1 - day;

  // Create new date with local time
  const monday = new Date(year, month, dateNum + diff, 0, 0, 0, 0);

  return monday;
};

const getSunday = (monday: Date) => {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

const formatWeekRange = (monday: Date) => {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const monthNames = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"];

  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const startMonth = monthNames[monday.getMonth()];
  const endMonth = monthNames[sunday.getMonth()];
  const year = monday.getFullYear();

  if (monday.getMonth() === sunday.getMonth()) {
    return `${startDay}-${endDay} ${startMonth} ${year}`;
  } else {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  }
};

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Week navigation state - always start with current week
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));

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

  // Reset to current week when returning to this page
  useEffect(() => {
    setCurrentWeekStart(getMonday(new Date()));
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

  const handleStatusChange = async (dayId: string, newStatus: PaymentStatus, e: React.MouseEvent, currentStatus?: string) => {
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
      await api.updateWorkDay(dayId, {
        payment_status: newStatus,
        day_paid_amount: newStatus === "unpaid" ? 0 : undefined,
      });

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

  // Week navigation functions
  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getMonday(new Date()));
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
    setCurrentWeekStart(getMonday(new Date()));
  };

  // Check if current week is selected
  const isCurrentWeek = useMemo(() => {
    if (isCustomPeriodMode) return false;
    const today = getMonday(new Date());
    return currentWeekStart.getTime() === today.getTime();
  }, [currentWeekStart, isCustomPeriodMode]);

  // Filter work days for current week or custom period
  const weekWorkDays = useMemo(() => {
    let periodStart: Date;
    let periodEnd: Date;

    if (isCustomPeriodMode && customStartDate && customEndDate) {
      periodStart = customStartDate;
      periodEnd = customEndDate;
    } else {
      periodStart = currentWeekStart;
      periodEnd = getSunday(currentWeekStart);
    }

    const days: Array<WorkDay & { reportId: string; clientName: string; paymentStatus: string }> = [];

    reports.forEach(report => {
      report.workDays.forEach(day => {
        const dayDate = new Date(day.date);
        if (dayDate >= periodStart && dayDate <= periodEnd) {
          days.push({
            ...day,
            reportId: report.id,
            clientName: report.clientName || report.client_name || 'Без імені',
            paymentStatus: day.paymentStatus || day.payment_status || 'unpaid'
          });
        }
      });
    });

    return days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reports, currentWeekStart, isCustomPeriodMode, customStartDate, customEndDate]);

  // Group work days by date (Sunday at top, Monday at bottom)
  const groupedByDay = useMemo(() => {
    const daysList: Array<{ date: string; days: Array<WorkDay & { reportId: string; clientName: string; paymentStatus: string }> }> = [];

    if (isCustomPeriodMode && customStartDate && customEndDate) {
      // For custom period, create all days between start and end
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const tempList: string[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        tempList.push(formatLocalDate(d));
      }

      // Reverse to show latest first
      tempList.reverse().forEach(dateKey => {
        daysList.push({ date: dateKey, days: [] });
      });
    } else {
      // Create all 7 days of the week from Sunday (6) to Monday (0) - reversed
      for (let i = 6; i >= 0; i--) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateKey = formatLocalDate(date);
        daysList.push({ date: dateKey, days: [] });
      }
    }

    // Fill with actual work days
    weekWorkDays.forEach(day => {
      const entry = daysList.find(d => d.date === day.date);
      if (entry) {
        entry.days.push(day);
      }
    });

    // Check if there are any work days
    const hasWorkDays = weekWorkDays.length > 0;

    if (!isCustomPeriodMode) {
      // Find today's date
      const todayKey = formatLocalDate(new Date());
      const todayIndex = daysList.findIndex(d => d.date === todayKey);

      if (hasWorkDays) {
        // If there are work days, find the last day with work
        let lastWorkDayIndex = -1;
        for (let i = 0; i < daysList.length; i++) {
          if (daysList[i].days.length > 0) {
            lastWorkDayIndex = i;
            break; // Since we're going from top (latest) to bottom (earliest)
          }
        }

        // Keep days from Monday to the last work day OR today (whichever is first)
        if (lastWorkDayIndex >= 0) {
          // If today is in the week and is before the last work day, show up to today
          if (todayIndex >= 0 && todayIndex < lastWorkDayIndex) {
            return daysList.slice(todayIndex);
          }
          // Otherwise show up to the last work day
          return daysList.slice(lastWorkDayIndex);
        }
      } else {
        // If no work days but today is in this week, show only today
        if (todayIndex >= 0) {
          return daysList.slice(todayIndex, todayIndex + 1);
        }
      }
    }

    return daysList;
  }, [weekWorkDays, currentWeekStart, isCustomPeriodMode, customStartDate, customEndDate]);

  // Week statistics
  const weekStats = useMemo(() => {
    let totalHours = 0;
    let totalEarned = 0;
    let totalPaid = 0;

    weekWorkDays.forEach(day => {
      totalHours += day.hours;
      totalEarned += day.amount;

      const status = day.paymentStatus;
      if (status === 'paid') {
        totalPaid += day.amount;
      } else if (status === 'partial') {
        totalPaid += day.day_paid_amount || 0;
      }
    });

    const paidPercentage = totalEarned > 0 ? Math.round((totalPaid / totalEarned) * 100) : 0;

    return {
      totalHours,
      totalEarned,
      totalPaid,
      totalRemaining: totalEarned - totalPaid,
      paidPercentage
    };
  }, [weekWorkDays]);

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
      {/* Week Navigator */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border-b border-white/10 shadow-[0_2px_16px_0_rgba(31,38,135,0.1)]" data-no-swipe>
        <div className="container mx-auto px-4 py-3">
          {/* Navigation Controls */}
          <div className="flex items-center justify-between mb-3">
            {!isCustomPeriodMode ? (
              <button
                onClick={goToPreviousWeek}
                className="p-2 rounded-full hover:bg-primary/10 transition-all"
                aria-label="Попередній тиждень"
              >
                <ChevronLeft className="w-6 h-6 text-primary stroke-[2.5]" />
              </button>
            ) : (
              <div className="w-10"></div>
            )}

            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleOpenDatePicker}
                className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {isCustomPeriodMode && customStartDate && customEndDate
                  ? `${customStartDate.toLocaleDateString("uk-UA", { day: 'numeric', month: 'short' })} - ${customEndDate.toLocaleDateString("uk-UA", { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : formatWeekRange(currentWeekStart)}
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
                onClick={goToNextWeek}
                className="p-2 rounded-full hover:bg-primary/10 transition-all"
                aria-label="Наступний тиждень"
              >
                <ChevronRight className="w-6 h-6 text-primary stroke-[2.5]" />
              </button>
            ) : (
              <div className="w-10"></div>
            )}
          </div>

          {/* Week Statistics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2 text-center border border-purple-200/60">
              <p className="text-xs text-purple-700 font-medium">Годин</p>
              <p className="text-lg font-bold text-purple-900">{weekStats.totalHours.toFixed(1)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 text-center border border-blue-200/60">
              <p className="text-xs text-blue-700 font-medium">Заробіток</p>
              <p className="text-lg font-bold text-blue-900">{Math.round(weekStats.totalEarned)}€</p>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-36 pb-6 space-y-4">
        {/* Return to Today Button */}
        {!isCurrentWeek && !isCustomPeriodMode && (
          <div className="flex justify-center mb-4">
            <button
              onClick={goToCurrentWeek}
              className="bg-primary/10 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              {currentWeekStart < getMonday(new Date()) ? (
                <>
                  <span className="text-sm font-semibold text-primary">Повернутися на сьогодні</span>
                  <Redo2 className="w-4 h-4 text-primary" />
                </>
              ) : (
                <>
                  <Undo2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">Повернутися на сьогодні</span>
                </>
              )}
            </button>
          </div>
        )}

        {groupedByDay.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold text-foreground mb-2">Немає записів</p>
            <p className="text-muted-foreground text-sm">на цьому тижні</p>
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
                <div className="sticky top-[140px] z-30 flex justify-center py-1.5">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-sm ${
                    isToday
                      ? 'bg-primary/20 backdrop-blur-xl border border-primary/30'
                      : 'bg-card/95 backdrop-blur-xl border border-border/50'
                  }`}>
                    <Calendar className={`w-3.5 h-3.5 ${
                      isToday ? 'text-primary' : daysData.length === 0 ? 'text-muted-foreground' : 'text-foreground'
                    }`} />
                    <span className={`text-xs font-semibold ${
                      isToday ? 'text-primary' : daysData.length === 0 ? 'text-muted-foreground' : 'text-foreground'
                    }`}>
                      {dayNumber}
                    </span>
                    <span className={`text-xs font-medium ${
                      isToday ? 'text-primary' : daysData.length === 0 ? 'text-muted-foreground' : 'text-foreground'
                    }`}>
                      {dayName}
                      {isToday && ' (Сьогодні)'}
                    </span>
                  </div>
                </div>

                {/* Work Days for this date */}
                {daysData.length > 0 && (
                  <div className="space-y-2">
                    {daysData.map((day, dayIndex) => (
                      <div key={`${day.reportId}-${day.id}`}>
                        <div className="flex gap-2">
                          <div
                            onClick={() => navigate(`/report/${day.reportId}/day/${day.id}`)}
                            className={`flex-1 bg-card rounded-lg p-3 border border-border hover:shadow-md transition-smooth cursor-pointer ${
                              dayIndex === daysData.length - 1
                                ? 'shadow-[0_4px_16px_0_rgba(31,38,135,0.15)]'
                                : 'shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              {/* Ліва частина: індикатор + ім'я */}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <button className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 ${
                                      day.paymentStatus === 'paid' ? 'bg-success/20 hover:bg-success/30' :
                                      day.paymentStatus === 'partial' ? 'bg-warning/20 hover:bg-warning/30' : 'bg-destructive/20 hover:bg-destructive/30'
                                    }`}>
                                      <span className={`text-xs font-bold ${
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
                                        onClick={(e) => handleStatusChange(day.id, "paid", e, day.paymentStatus)}
                                        className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all bg-success/20 text-success"
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                                        Оплачено
                                      </DropdownMenuItem>
                                    )}
                                    {day.paymentStatus === 'partial' && (
                                      <DropdownMenuItem
                                        onClick={(e) => handleStatusChange(day.id, "partial", e, day.paymentStatus)}
                                        className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all bg-warning/20 text-warning"
                                      >
                                        <AlertCircle className="w-4 h-4 mr-2 inline" />
                                        Частково
                                      </DropdownMenuItem>
                                    )}
                                    {day.paymentStatus === 'unpaid' && (
                                      <DropdownMenuItem
                                        onClick={(e) => handleStatusChange(day.id, "unpaid", e, day.paymentStatus)}
                                        className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all bg-destructive/20 text-destructive"
                                      >
                                        <XCircle className="w-4 h-4 mr-2 inline" />
                                        Не оплачено
                                      </DropdownMenuItem>
                                    )}

                                    {/* Other statuses */}
                                    {day.paymentStatus !== 'paid' && (
                                      <DropdownMenuItem
                                        onClick={(e) => handleStatusChange(day.id, "paid", e, day.paymentStatus)}
                                        className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all text-foreground hover:bg-success/10"
                                      >
                                        <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                                        Оплачено
                                      </DropdownMenuItem>
                                    )}
                                    {day.paymentStatus !== 'partial' && (
                                      <DropdownMenuItem
                                        onClick={(e) => handleStatusChange(day.id, "partial", e, day.paymentStatus)}
                                        className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all text-foreground hover:bg-warning/10"
                                      >
                                        <AlertCircle className="w-4 h-4 mr-2 inline" />
                                        Частково
                                      </DropdownMenuItem>
                                    )}
                                    {day.paymentStatus !== 'unpaid' && (
                                      <DropdownMenuItem
                                        onClick={(e) => handleStatusChange(day.id, "unpaid", e, day.paymentStatus)}
                                        className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold transition-all text-foreground hover:bg-destructive/10"
                                      >
                                        <XCircle className="w-4 h-4 mr-2 inline" />
                                        Не оплачено
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <h3 className={`text-sm font-semibold truncate ${
                                  day.paymentStatus === 'paid' ? 'text-success' : 'text-foreground'
                                }`}>
                                  {day.clientName}
                                </h3>
                              </div>

                              {/* Права частина: години + сума */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="bg-purple-50 rounded-lg px-2 py-1 flex items-center gap-1 min-w-[68px]">
                                  <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  <span className="text-sm font-bold text-foreground tabular-nums flex-1 text-center">{day.hours}</span>
                                </div>

                                <div className="bg-blue-50 rounded-lg px-2 py-1 flex items-center gap-1 min-w-[78px]">
                                  <Euro className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <span className="text-sm font-bold text-foreground tabular-nums flex-1 text-center">{Math.round(day.amount)}</span>
                                </div>
                              </div>
                            </div>

                            {day.note && (
                              <p className="text-xs text-muted-foreground mt-2 truncate">📝 {day.note}</p>
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
                                  placeholder={`Залишок: ${Math.round(day.amount - (day.day_paid_amount || 0))}€`}
                                  className="h-9 text-sm rounded-lg"
                                  autoFocus
                                />
                              </div>
                              <button
                                onClick={() => handleApplyPartialPayment(day)}
                                disabled={
                                  !partialPaymentAmount ||
                                  parseFloat(partialPaymentAmount) <= 0 ||
                                  (parseFloat(partialPaymentAmount) + (day.day_paid_amount || 0)) > day.amount
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
                        ? "bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border-emerald-400/50 dark:border-emerald-600/50"
                        : "bg-card border-border"
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold text-sm ${userSelectedYear ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"}`}>
                          {selectedYear ?? "Рік"}
                        </span>
                        <ChevronDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
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
                              ? "bg-gradient-to-r from-emerald-500/40 to-teal-500/40 text-foreground"
                              : "text-foreground hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-teal-500/20"
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

            {/* Date Range Display */}
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Період</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">З</Label>
                  <Input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => {
                      setTempStartDate(e.target.value);
                      setSelectedYear(null);
                      setSelectedMonth(null);
                      setUserSelectedYear(false);
                      setUserSelectedMonth(false);
                      setUserManuallyEditedStartDate(true);
                      setUserManuallyEditedEndDate(false);
                    }}
                    className={`h-10 rounded-lg transition-all ${
                      userManuallyEditedStartDate
                        ? 'border-2 border-blue-400 dark:border-blue-500 ring-1 ring-blue-400/30 dark:ring-blue-500/30'
                        : (userSelectedYear || userSelectedMonth)
                        ? 'border border-emerald-400 dark:border-emerald-500 ring-1 ring-emerald-400/20 dark:ring-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : ''
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">До</Label>
                  <Input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => {
                      setTempEndDate(e.target.value);
                      setSelectedYear(null);
                      setSelectedMonth(null);
                      setUserSelectedYear(false);
                      setUserSelectedMonth(false);
                      setUserManuallyEditedStartDate(false);
                      setUserManuallyEditedEndDate(true);
                    }}
                    className={`h-10 rounded-lg transition-all ${
                      userManuallyEditedEndDate
                        ? 'border-2 border-blue-400 dark:border-blue-500 ring-1 ring-blue-400/30 dark:ring-blue-500/30'
                        : (userSelectedYear || userSelectedMonth)
                        ? 'border border-emerald-400 dark:border-emerald-500 ring-1 ring-emerald-400/20 dark:ring-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : ''
                    }`}
                  />
                </div>
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
