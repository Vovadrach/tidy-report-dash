import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, CheckCircle as CheckCircle2, XCircle, WarningCircle as AlertCircle,
  CalendarBlank as Calendar, CircleNotch as Loader2, CurrencyEur as Euro,
  CaretLeft as ChevronLeft, CaretRight as ChevronRight, X,
  ArrowCounterClockwise as Undo2, ArrowClockwise as Redo2, CaretDown as ChevronDown,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSetPayment, useWorkDays } from "@/data/queries";
import { useWorkerFilter } from "@/contexts/WorkerContext";
import { decimalToHours } from "@/domain/time";
import {
  addMonths, dayNumber, dayOfWeekName, formatMonthYear, fromISODate, inRange,
  isSameMonth, monthName, monthNames, monthRange, todayLocal, toISODate,
} from "@/domain/dates";
import type { DateRange } from "@/domain/dates";
import { applyPartialPayment, involvesWorker, workerView } from "@/domain/money";
import { periodStats } from "@/domain/stats";
import type { PaymentStatus, WorkDay } from "@/domain/types";

const Index = () => {
  const navigate = useNavigate();
  const { selectedWorkerId } = useWorkerFilter();
  const { data: workDays = [], isLoading, isError, refetch } = useWorkDays();
  const setPayment = useSetPayment();

  // Навігація місяцями
  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  // Довільний період
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number | null>(null);
  const [pickerMonth, setPickerMonth] = useState<number | null>(null);

  // Інлайн часткова оплата
  const [partialPaymentDayId, setPartialPaymentDayId] = useState<string | null>(null);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState("");

  const range: DateRange = useMemo(
    () => customRange ?? monthRange(currentMonth),
    [customRange, currentMonth],
  );

  const visibleDays = useMemo(
    () =>
      workDays.filter(
        (d) => inRange(d.date, range) && involvesWorker(d, selectedWorkerId),
      ),
    [workDays, range, selectedWorkerId],
  );

  const stats = useMemo(
    () => periodStats(workDays, range, selectedWorkerId),
    [workDays, range, selectedWorkerId],
  );

  // Групування за датами (нові згори); сьогодні — завжди в списку
  const groupedByDay = useMemo(() => {
    const map = new Map<string, WorkDay[]>();
    for (const day of visibleDays) {
      const list = map.get(day.date) ?? [];
      list.push(day);
      map.set(day.date, list);
    }
    const today = todayLocal();
    if (inRange(today, range) && !map.has(today)) map.set(today, []);
    return [...map.entries()]
      .map(([date, days]) => ({ date, days }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [visibleDays, range]);

  const isCurrentMonth = !customRange && isSameMonth(currentMonth, new Date());

  const handleStatusChange = (day: WorkDay, newStatus: PaymentStatus) => {
    if (newStatus === "partial") {
      setPartialPaymentDayId(day.id);
      setPartialPaymentAmount("");
      if (day.status === "paid") {
        setPayment.mutate({ dayId: day.id, status: "partial", paidAmount: 0 });
      }
      return;
    }
    if (partialPaymentDayId === day.id) {
      setPartialPaymentDayId(null);
      setPartialPaymentAmount("");
    }
    setPayment.mutate({
      dayId: day.id,
      status: newStatus,
      paidAmount: newStatus === "paid" ? day.amount : 0,
    });
  };

  const handleApplyPartialPayment = (day: WorkDay) => {
    const result = applyPartialPayment(day, parseFloat(partialPaymentAmount));
    if (!result.ok) {
      toast.error(result.error === "exceeds" ? "Сума перевищує загальну вартість" : "Введіть коректну суму");
      return;
    }
    setPayment.mutate({ dayId: day.id, status: result.status, paidAmount: result.paidAmount });
    setPartialPaymentDayId(null);
    setPartialPaymentAmount("");
    toast.success("Оплату додано", { duration: 2000 });
  };

  const handleOpenDatePicker = () => {
    const now = new Date();
    setIsDatePickerOpen(true);
    setPickerYear(customRange ? null : now.getFullYear());
    setPickerMonth(customRange ? null : now.getMonth());
  };

  const handleApplyCustomPeriod = () => {
    if (pickerYear === null) {
      toast.error("Оберіть період");
      return;
    }
    if (pickerMonth === null) {
      setCustomRange({ from: `${pickerYear}-01-01`, to: `${pickerYear}-12-31` });
    } else {
      setCustomRange(monthRange(new Date(pickerYear, pickerMonth, 1)));
    }
    setIsDatePickerOpen(false);
    toast.success("Період застосовано", { duration: 2000 });
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setCustomRange(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground text-lg mb-4">Помилка завантаження записів</p>
          <Button onClick={() => refetch()}>Спробувати знову</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Month Navigator */}
      <div className="fixed top-0 left-0 right-0 z-40 app-bar" data-no-swipe>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            {!customRange ? (
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
                className="p-2.5 rounded-full text-primary hover:bg-primary/10 transition-all active:scale-90"
                aria-label="Попередній місяць"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-10"></div>
            )}

            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleOpenDatePicker}
                className="px-5 py-1.5 rounded-full hover:bg-primary/10 transition-all active:scale-95 cursor-pointer"
              >
                <span className="display text-[1.45rem] text-foreground">
                  {customRange
                    ? `${fromISODate(customRange.from).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })} – ${fromISODate(customRange.to).toLocaleDateString("uk-UA", { day: "numeric", month: "short", year: "numeric" })}`
                    : formatMonthYear(currentMonth)}
                </span>
              </button>
              {customRange && (
                <button
                  onClick={goToCurrentMonth}
                  className="text-xs text-destructive hover:underline font-semibold flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Скинути період
                </button>
              )}
            </div>

            {!customRange ? (
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                className="p-2.5 rounded-full text-primary hover:bg-primary/10 transition-all active:scale-90"
                aria-label="Наступний місяць"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-10"></div>
            )}
          </div>

          {/* Period Statistics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="stat-tile stat-tile-time">
              <div className="icon-badge icon-badge-time">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="caption-label">Годин</p>
                <p className="display text-[1.4rem] text-foreground leading-tight">{decimalToHours(stats.hours)}</p>
              </div>
            </div>
            <div className="stat-tile stat-tile-money">
              <div className="icon-badge icon-badge-money">
                <Euro className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="caption-label">Заробіток</p>
                <p className="display text-[1.4rem] text-foreground leading-tight">{Math.round(stats.earned)}€</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-[152px] pb-dock space-y-5">
        {!isCurrentMonth && !customRange && (
          <div className="flex justify-center mb-4">
            <button
              onClick={goToCurrentMonth}
              className="bg-primary/10 hover:bg-primary/15 px-4 py-2 rounded-full flex items-center gap-2 transition-colors active:scale-95"
            >
              {currentMonth < new Date(new Date().getFullYear(), new Date().getMonth(), 1) ? (
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
            <div className="icon-badge icon-badge-time w-16 h-16 rounded-2xl mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">Немає записів</p>
            <p className="text-muted-foreground text-sm">у цьому періоді</p>
          </div>
        ) : (
          groupedByDay.map(({ date, days }) => {
            const isToday = todayLocal() === date;

            return (
              <div key={date} className="space-y-2" data-no-swipe>
                {/* Маркер дати — липкий */}
                <div
                  className="sticky flex flex-col items-center gap-1.5 py-1.5"
                  style={{ top: "152px", zIndex: 30 }}
                >
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full shadow-sm backdrop-blur-xl border ${
                    isToday
                      ? "bg-primary/10 border-primary/30"
                      : "bg-card/95 border-border"
                  }`}>
                    <Calendar className={`w-3.5 h-3.5 ${
                      isToday ? "text-primary" : days.length === 0 ? "text-muted-foreground" : "text-foreground"
                    }`} />
                    <span className={`text-xs font-bold tabular-nums ${
                      isToday ? "text-primary" : days.length === 0 ? "text-muted-foreground" : "text-foreground"
                    }`}>
                      {dayNumber(date)}
                    </span>
                    <span className={`text-xs font-semibold ${
                      isToday ? "text-primary" : days.length === 0 ? "text-muted-foreground" : "text-foreground"
                    }`}>
                      {dayOfWeekName(date)}
                      {isToday && " (Сьогодні)"}
                    </span>
                  </div>

                  {isToday && days.length === 0 && (
                    <span className="text-xs text-muted-foreground">Записів ще немає</span>
                  )}
                </div>

                {days.length > 0 && (
                  <div className="space-y-2">
                    {days.map((day) => {
                      const v = workerView(day, selectedWorkerId);
                      return (
                        <div key={day.id}>
                          <div className="flex gap-2">
                            <div
                              onClick={() => {
                                if (day.isPlanned) {
                                  navigate(`/create-report?clientId=${day.clientId}&date=${day.date}&workDayId=${day.id}&reportId=${day.reportId}`);
                                } else {
                                  navigate(`/report/${day.reportId}/day/${day.id}`);
                                }
                              }}
                              className={`flex-1 rounded-xl p-2 sm:p-2.5 cursor-pointer ${
                                day.isPlanned
                                  ? "bg-warning/8 border-2 border-dashed border-warning/45 rounded-xl surface-card-hover"
                                  : "surface-card surface-card-hover"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                                  {!day.isPlanned && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <button className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 ${
                                          day.status === "paid" ? "bg-success/20 hover:bg-success/30" :
                                          day.status === "partial" ? "bg-warning/20 hover:bg-warning/30" : "bg-destructive/20 hover:bg-destructive/30"
                                        }`}>
                                          <span className={`text-[10px] sm:text-xs font-bold ${
                                            day.status === "paid" ? "text-success" :
                                            day.status === "partial" ? "text-warning" : "text-destructive"
                                          }`}>
                                            {day.status === "paid" ? "✓" : day.status === "partial" ? "◐" : "○"}
                                          </span>
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent className="z-[100] rounded-xl p-1.5 min-w-[150px] shadow-lg">
                                        <DropdownMenuItem
                                          onClick={(e) => { e.stopPropagation(); handleStatusChange(day, "paid"); }}
                                          className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold ${day.status === "paid" ? "bg-success/20 text-success" : "text-foreground hover:bg-success/10"}`}
                                        >
                                          <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                                          Оплачено
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={(e) => { e.stopPropagation(); handleStatusChange(day, "partial"); }}
                                          className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold ${day.status === "partial" ? "bg-warning/20 text-warning" : "text-foreground hover:bg-warning/10"}`}
                                        >
                                          <AlertCircle className="w-4 h-4 mr-2 inline" />
                                          Частково
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={(e) => { e.stopPropagation(); handleStatusChange(day, "unpaid"); }}
                                          className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold ${day.status === "unpaid" ? "bg-destructive/20 text-destructive" : "text-foreground hover:bg-destructive/10"}`}
                                        >
                                          <XCircle className="w-4 h-4 mr-2 inline" />
                                          Не оплачено
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                  <h3 className={`text-xs sm:text-sm font-bold truncate ${
                                    day.status === "paid" && !day.isPlanned ? "text-success" : "text-foreground"
                                  }`}>
                                    {day.clientName}
                                  </h3>

                                  {!day.isPlanned && day.assignments.length === 1 && (
                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground ml-1">
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: day.assignments[0].workerColor }}
                                      />
                                      <span className="text-[10px]">{day.assignments[0].workerName}</span>
                                    </div>
                                  )}
                                </div>

                                {day.isPlanned ? (
                                  <div className="chip chip-due rounded-full">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">Заплановано</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <div className="chip chip-time min-w-[55px]">
                                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                      <span>{decimalToHours(v.hours)}</span>
                                    </div>
                                    <div className="chip chip-money min-w-[55px]">
                                      <Euro className="w-3.5 h-3.5 flex-shrink-0" />
                                      <span>{Math.round(v.amount)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {day.note && (
                                <p className="text-xs text-muted-foreground mt-2 truncate">📝 {day.note}</p>
                              )}

                              {day.assignments.length > 1 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {day.assignments.map((assignment) => (
                                    <div
                                      key={assignment.id}
                                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground"
                                    >
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: assignment.workerColor }}
                                      />
                                      <span className="text-[10px]">{assignment.workerName}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {partialPaymentDayId === day.id && (
                            <div className="mt-2 surface-card p-3 border-warning/40" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-2 items-start">
                                <div className="flex-1">
                                  <Input
                                    type="number"
                                    value={partialPaymentAmount}
                                    onChange={(e) => setPartialPaymentAmount(e.target.value)}
                                    placeholder={`Залишок: ${Math.round(day.amount - day.paidAmount)}€`}
                                    className="h-9 text-sm rounded-lg"
                                    autoFocus
                                  />
                                </div>
                                <button
                                  onClick={() => handleApplyPartialPayment(day)}
                                  disabled={
                                    !partialPaymentAmount ||
                                    parseFloat(partialPaymentAmount) <= 0 ||
                                    parseFloat(partialPaymentAmount) + day.paidAmount > day.amount
                                  }
                                  className="h-9 px-4 rounded-full text-sm font-bold bg-warning hover:bg-warning/90 text-warning-foreground transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => { setPartialPaymentDayId(null); setPartialPaymentAmount(""); }}
                                  className="h-9 px-4 rounded-full text-sm font-bold bg-secondary hover:bg-muted text-secondary-foreground transition-colors active:scale-95"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      <BottomNavigation />

      {/* Custom Period Dialog */}
      <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <DialogContent className="w-[calc(100%-3rem)] max-w-md rounded-3xl left-1/2 -translate-x-1/2 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Виберіть період</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold text-foreground">Швидкий вибір</Label>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`flex-1 px-4 py-3 rounded-xl border shadow-xs hover:shadow-sm transition-all active:scale-[0.98] ${
                      pickerYear !== null ? "bg-primary/10 border-primary/40" : "bg-card border-border"
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold text-sm ${pickerYear !== null ? "text-primary" : "text-foreground"}`}>
                          {pickerYear ?? "Рік"}
                        </span>
                        <ChevronDown className="w-5 h-5 text-primary" />
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-[110] rounded-xl p-1.5 min-w-[140px] max-h-[300px] overflow-y-auto shadow-lg">
                    <div className="space-y-0.5">
                      {[2024, 2025, 2026, 2027, 2028].map((year) => (
                        <DropdownMenuItem
                          key={year}
                          onClick={() => setPickerYear(year)}
                          className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold ${
                            pickerYear === year ? "bg-primary/15 text-primary" : "text-foreground hover:bg-primary/8"
                          }`}
                        >
                          {year}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`flex-1 px-4 py-3 rounded-xl border shadow-xs hover:shadow-sm transition-all active:scale-[0.98] ${
                      pickerMonth !== null ? "bg-accent/12 border-accent/40" : "bg-card border-border"
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold text-sm ${pickerMonth !== null ? "text-accent" : "text-foreground"}`}>
                          {pickerMonth !== null ? monthName(pickerMonth) : "Місяць"}
                        </span>
                        <ChevronDown className="w-5 h-5 text-accent" />
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-[110] rounded-xl p-1.5 min-w-[140px] max-h-[300px] overflow-y-auto shadow-lg">
                    <div className="space-y-0.5">
                      <DropdownMenuItem
                        onClick={() => setPickerMonth(null)}
                        className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold ${
                          pickerMonth === null ? "bg-accent/15 text-accent" : "text-foreground hover:bg-accent/8"
                        }`}
                      >
                        Весь рік
                      </DropdownMenuItem>
                      {monthNames().map((month, i) => (
                        <DropdownMenuItem
                          key={i}
                          onClick={() => setPickerMonth(i)}
                          className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold ${
                            pickerMonth === i ? "bg-accent/15 text-accent" : "text-foreground hover:bg-accent/8"
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

            <div className="flex gap-2">
              <Button onClick={() => setIsDatePickerOpen(false)} variant="outline" className="flex-1 h-10">
                Скасувати
              </Button>
              <Button onClick={handleApplyCustomPeriod} disabled={pickerYear === null} className="flex-1 h-10">
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
