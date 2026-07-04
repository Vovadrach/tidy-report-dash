import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { Report, WorkDay, Client, PaymentStatus } from "@/types/report";
import { Clock, CurrencyEur as Euro, Trash as Trash2, CalendarBlank as Calendar } from "@phosphor-icons/react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TimePickerWheel } from "@/components/TimePickerWheel";
import { decimalToHours, hoursToDecimal } from "@/domain/time";


const WorkDayDetails = () => {
  const { reportId, dayId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editNote, setEditNote] = useState("");
  const [partialAmount, setPartialAmount] = useState("");
  const [dayPaidAmount, setDayPaidAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Use refs to store latest values for cleanup
  const hasUnsavedChangesRef = useRef(false);
  const workDayRef = useRef<WorkDay | null>(null);
  const clientRef = useRef<Client | null>(null);
  const editDateRef = useRef("");
  const editHoursRef = useRef("");
  const editNoteRef = useRef("");

  // Update refs when state changes
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    workDayRef.current = workDay;
  }, [workDay]);

  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  useEffect(() => {
    editDateRef.current = editDate;
  }, [editDate]);

  useEffect(() => {
    editHoursRef.current = editHours;
  }, [editHours]);

  useEffect(() => {
    editNoteRef.current = editNote;
  }, [editNote]);

  useEffect(() => {
    if (reportId && dayId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, dayId]);

  // Auto-save on unmount or page leave
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Автозбереження при виході зі сторінки
      if (hasUnsavedChangesRef.current) {
        handleSave();
      }

      // Save on unmount only
      if (hasUnsavedChangesRef.current && workDayRef.current && clientRef.current && editHoursRef.current) {
        const hours = hoursToDecimal(editHoursRef.current);
        const hourlyRate = clientRef.current.hourlyRate || clientRef.current.hourly_rate || 0;
        const amount = hours * hourlyRate;

        api.updateWorkDay(workDayRef.current.id, {
          date: editDateRef.current,
          hours,
          amount,
          note: editNoteRef.current,
        }).catch(error => {
          console.error('Error saving on unmount:', error);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const reports = await api.getReports();
      const loadedReport = reports.find((r) => r.id === reportId);
      if (loadedReport) {
        setReport(loadedReport);
        const day = loadedReport.workDays.find((d) => d.id === dayId);
        if (day) {
          setWorkDay(day);
          setEditDate(day.date);
          setEditHours(decimalToHours(day.hours));
          setEditNote(day.note || "");

          const dayPaid = day.day_paid_amount || 0;
          setDayPaidAmount(dayPaid);
        }

        const clients = await api.getClients();
        const loadedClient = clients.find((c) => c.id === loadedReport.clientId || c.id === loadedReport.client_id);
        setClient(loadedClient || null);
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      toast.error('Помилка завантаження даних');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!report || !workDay || !editHours || !client) {
      return;
    }

    try {
      const hours = hoursToDecimal(editHours);
      const hourlyRate = client.hourlyRate || client.hourly_rate || 0;
      const amount = hours * hourlyRate;

      await api.updateWorkDay(workDay.id, {
        date: editDate,
        hours,
        amount,
        note: editNote,
        // Автоматично скасувати "запланований" статус коли є години
        is_planned: hours > 0 ? false : workDay.is_planned,
      });

      setHasUnsavedChanges(false);

      // Update local workDay state without reloading everything
      setWorkDay({
        ...workDay,
        date: editDate,
        hours,
        amount,
        note: editNote,
      });
    } catch (error) {
      toast.error('Помилка оновлення');
      console.error(error);
    }
  };

  const handleSetUnpaid = async () => {
    if (!report || !workDay) return;

    try {
      await api.updateWorkDay(workDay.id, {
        payment_status: "unpaid" as PaymentStatus,
        day_paid_amount: 0,
      });

      await loadData();
      setPartialAmount("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleSetPartial = async () => {
    if (!report || !workDay) return;

    try {
      await api.updateWorkDay(workDay.id, {
        payment_status: "partial" as PaymentStatus,
        day_paid_amount: dayPaidAmount || 0,
      });

      await loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!report || !workDay) return;

    try {
      await api.updateWorkDay(workDay.id, {
        payment_status: "paid" as PaymentStatus,
      });

      await loadData();
      setPartialAmount("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleApplyPartial = async () => {
    if (!report || !workDay || !partialAmount || !client) {
      return;
    }

    const partial = parseFloat(partialAmount);

    // Calculate current amount based on edited hours
    const hours = editHours ? hoursToDecimal(editHours) : workDay.hours;
    const hourlyRate = client.hourlyRate || client.hourly_rate || 0;
    const currentAmount = hours * hourlyRate;

    const newDayPaidTotal = dayPaidAmount + partial;

    if (newDayPaidTotal > currentAmount) {
      toast.error("Сума не може перевищувати загальну вартість");
      return;
    }

    try {
      let newStatus: PaymentStatus = "partial";
      if (newDayPaidTotal >= currentAmount) {
        newStatus = "paid";
      }

      await api.updateWorkDay(workDay.id, {
        payment_status: newStatus,
        day_paid_amount: newDayPaidTotal,
      });

      await loadData();
      setPartialAmount("");
      toast.success("Часткову оплату додано", { duration: 2000 });
    } catch (error) {
      toast.error("Помилка додавання оплати");
      console.error(error);
    }
  };

  const handleDeleteReport = async () => {
    if (!report) return;
    try {
      await api.deleteReport(report.id);
      toast.success("Звіт видалено", { duration: 2000 });
      navigate("/");
    } catch (error) {
      toast.error('Помилка видалення звіту');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Завантаження...</p>
      </div>
    );
  }

  if (!report || !workDay || !client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Дані не знайдено</p>
      </div>
    );
  }

  const status = workDay.paymentStatus || workDay.payment_status || "unpaid";

  // Calculate current amount based on edited hours
  const currentHours = editHours ? hoursToDecimal(editHours) : workDay.hours;
  const hourlyRate = client?.hourlyRate || client?.hourly_rate || 0;
  const currentAmount = currentHours * hourlyRate;

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed top section with glassmorphism */}
      <div className="fixed top-0 left-0 right-0 z-40 app-bar">
        <div className="container mx-auto px-4 py-3">
          {/* Client Name */}
          <div className="text-center mb-3">
            <h1 className="num-display text-xl text-foreground">{client.name}</h1>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* Години блок - clickable */}
            <div
              onClick={() => setIsTimePickerOpen(true)}
              className="stat-tile stat-tile-time cursor-pointer active:scale-95 transition-transform"
            >
              <div className="icon-badge icon-badge-time w-9 h-9">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="micro-label mb-0.5 truncate">Години</p>
                <div className="flex items-baseline gap-1">
                  <p className="num-display text-xl text-foreground leading-none truncate">{decimalToHours(currentHours)}</p>
                  <p className="text-xs font-bold text-muted-foreground/70 flex-shrink-0">год</p>
                </div>
              </div>
            </div>

            {/* Сума блок */}
            <div className="stat-tile stat-tile-money">
              <div className="icon-badge icon-badge-money w-9 h-9">
                <Euro className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="micro-label mb-0.5 truncate">Сума</p>
                <div className="flex items-baseline gap-1">
                  <p className="num-display text-xl text-foreground leading-none truncate">{Math.round(currentAmount)}</p>
                  <p className="text-xs font-bold text-muted-foreground/70 flex-shrink-0">€</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TimePickerWheel Modal */}
      {isTimePickerOpen && (
        <TimePickerWheel
          value={editHours}
          onChange={(value) => {
            setEditHours(value);
            setHasUnsavedChanges(true);
            setIsTimePickerOpen(false);
          }}
          placeholder="0:00"
          hourlyRate={hourlyRate}
        />
      )}

      <main className="container mx-auto px-4 pt-[130px] pb-dock max-w-4xl space-y-3">
        {/* Payment Status Card */}
        <div className="surface-card p-3">
          {/* Payment Status Selector */}
          <div className="space-y-2">
            {/* Three Button Layout */}
            <div className="grid grid-cols-3 gap-1.5">
              {/* Partial Button */}
              <button
                onClick={handleSetPartial}
                className={`h-10 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                  status === "partial"
                    ? "bg-warning/12 text-warning border-2 border-warning/60 shadow-sm"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-warning/5"
                }`}
              >
                Частково
              </button>

              {/* Unpaid Button */}
              <button
                onClick={handleSetUnpaid}
                className={`h-10 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                  status === "unpaid"
                    ? "bg-destructive/12 text-destructive border-2 border-destructive/60 shadow-sm"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-destructive/5"
                }`}
              >
                Не оплачено
              </button>

              {/* Paid Button */}
              <button
                onClick={handleMarkAsPaid}
                className={`h-10 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                  status === "paid"
                    ? "bg-success/12 text-success border-2 border-success/60 shadow-sm"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-success/5"
                }`}
              >
                Оплачено
              </button>
            </div>

            {/* Partial Payment Input */}
            {status === "partial" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Додати суму"
                    max={currentAmount - dayPaidAmount}
                    className="flex-1 h-10 text-sm rounded-xl bg-background border-warning/40 focus-visible:ring-warning"
                  />
                  <button
                    onClick={handleApplyPartial}
                    disabled={!partialAmount || parseFloat(partialAmount) > (currentAmount - dayPaidAmount) || parseFloat(partialAmount) <= 0}
                    className="h-10 px-4 rounded-xl text-xs font-bold bg-warning hover:bg-warning/90 text-warning-foreground transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Додати
                  </button>
                </div>

                {/* Payment Info Display */}
                {dayPaidAmount > 0 && (
                  <div className="bg-warning/8 rounded-xl p-2.5">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Оплачено:</span>
                        <span className="font-bold text-foreground">{Math.round(dayPaidAmount)}€</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-warning font-medium">Залишок:</span>
                        <span className="font-bold text-warning tabular-nums">{Math.round(currentAmount - dayPaidAmount)}€</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Workers List */}
        {workDay.assignments && workDay.assignments.length > 0 && (
          <div className="space-y-1.5">
            {workDay.assignments.map((assignment) => {
              const worker = assignment.worker;
              const workerName = worker?.name || assignment.deleted_worker_name || 'Видалений працівник';
              const workerColor = worker?.color || '#999999';
              const showDetails = workDay.assignments && workDay.assignments.length > 1;

              return (
                <div
                  key={assignment.id}
                  className="flex items-center gap-2 py-2"
                >
                  <div
                    className="w-1 h-10 rounded-full"
                    style={{ backgroundColor: workerColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{workerName}</p>
                    {showDetails && (
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground tabular-nums">{decimalToHours(assignment.hours)} год</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-semibold text-foreground tabular-nums">{Math.round(assignment.amount)}€</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Date */}
        <div
          onClick={() => setIsDatePickerOpen(true)}
          className="flex items-center gap-3 py-3 cursor-pointer group"
        >
          <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Дата</p>
            <div className="relative">
              <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {editDate ? new Date(editDate + 'T00:00:00').toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Оберіть дату'}
              </span>
              <input
                ref={(el) => {
                  if (el && isDatePickerOpen) {
                    el.showPicker?.();
                    setIsDatePickerOpen(false);
                  }
                }}
                type="date"
                value={editDate}
                onChange={(e) => {
                  setEditDate(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Note */}
        <div>
          <Textarea
            value={editNote}
            onChange={(e) => {
              setEditNote(e.target.value);
              setHasUnsavedChanges(true);
            }}
            placeholder="📝 Нотатка..."
            className="min-h-[80px] resize-none text-sm bg-card border border-border rounded-xl px-3 py-2.5 shadow-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all placeholder:text-muted-foreground"
          />
        </div>

        {/* Delete Report Button */}
        <button
          onClick={() => setIsDeleteDialogOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 text-destructive/80 hover:text-destructive transition-colors py-3 rounded-xl border border-destructive/20 hover:bg-destructive/5 active:scale-[0.98]"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-xs font-bold">Видалити звіт</span>
        </button>
      </main>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="w-[calc(100%-3rem)] max-w-md rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити звіт?</AlertDialogTitle>
            <AlertDialogDescription>
              Запис буде видалено назавжди. Цю дію неможливо скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReport}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNavigation />
    </div>
  );
};

export default WorkDayDetails;
