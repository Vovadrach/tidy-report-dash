import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { Report, WorkDay, Client, PaymentStatus } from "@/types/report";
import { Clock, Euro, CheckCircle2, XCircle, AlertCircle, Trash2, Calendar, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { TimePickerWheel } from "@/components/TimePickerWheel";
import { decimalToHours } from "@/utils/timeFormat";

// Helper function to convert hours:minutes format to decimal
const hoursToDecimal = (hoursStr: string): number => {
  if (!hoursStr) return 0;

  // If it contains ':', parse as hours:minutes
  if (hoursStr.includes(':')) {
    const [hours, minutes] = hoursStr.split(':').map(s => parseInt(s) || 0);
    return hours + (minutes / 60);
  }

  // Otherwise parse as decimal
  return parseFloat(hoursStr) || 0;
};

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
    if (confirm("Ви впевнені, що хочете видалити цей звіт?")) {
      try {
        await api.deleteReport(report.id);
        toast.success("Звіт видалено", { duration: 2000 });
        navigate("/");
      } catch (error) {
        toast.error('Помилка видалення звіту');
        console.error(error);
      }
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
    <div className="min-h-screen bg-background pb-24">
      {/* Fixed top section with glassmorphism */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border-b border-white/10 shadow-[0_2px_16px_0_rgba(31,38,135,0.1)]">
        <div className="container mx-auto px-4 py-3">
          {/* Client Name */}
          <div className="text-center mb-3">
            <h1 className="text-base font-bold text-foreground">{client.name}</h1>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* Години блок - clickable */}
            <div
              onClick={() => setIsTimePickerOpen(true)}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 p-3 shadow-sm border border-border/50 min-w-0 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 border border-purple-200 dark:border-purple-800">
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-[10px] font-medium text-muted-foreground mb-0.5 truncate">Години</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-lg font-bold text-black dark:text-white leading-none truncate">{decimalToHours(currentHours)}</p>
                    <p className="text-xs font-semibold text-black dark:text-white flex-shrink-0">год</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Сума блок */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 p-3 shadow-sm border border-border/50 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 border border-blue-200 dark:border-blue-800">
                  <Euro className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-[10px] font-medium text-muted-foreground mb-0.5 truncate">Сума</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-lg font-bold text-black dark:text-white leading-none truncate">{Math.round(currentAmount)}</p>
                    <p className="text-xs font-semibold text-black dark:text-white flex-shrink-0">€</p>
                  </div>
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

      <main className="container mx-auto px-4 pt-[130px] max-w-4xl space-y-3">
        {/* Payment Status Card */}
        <div className="bg-card rounded-xl p-3 shadow-sm border border-border">
          {/* Payment Status Selector */}
          <div className="space-y-2">
            {/* Three Button Layout */}
            <div className="grid grid-cols-3 gap-1.5">
              {/* Partial Button */}
              <button
                onClick={handleSetPartial}
                className={`h-10 rounded-lg text-[11px] font-bold transition-all ${
                  status === "partial"
                    ? "bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 text-orange-800 dark:text-orange-100 shadow-[0_2px_8px_0_rgba(249,115,22,0.25)] border-2 border-orange-400 dark:border-orange-600"
                    : "bg-orange-50/30 dark:bg-orange-950/20 text-orange-600/60 dark:text-orange-400/60 border border-orange-300/50 dark:border-orange-700/50 active:bg-orange-50/50 dark:active:bg-orange-950/30"
                }`}
              >
                Частково
              </button>

              {/* Unpaid Button */}
              <button
                onClick={handleSetUnpaid}
                className={`h-10 rounded-lg text-[11px] font-bold transition-all ${
                  status === "unpaid"
                    ? "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 text-red-800 dark:text-red-100 shadow-[0_2px_8px_0_rgba(239,68,68,0.25)] border-2 border-red-400 dark:border-red-600"
                    : "bg-red-50/30 dark:bg-red-950/20 text-red-600/60 dark:text-red-400/60 border border-red-300/50 dark:border-red-700/50 active:bg-red-50/50 dark:active:bg-red-950/30"
                }`}
              >
                Не оплачено
              </button>

              {/* Paid Button */}
              <button
                onClick={handleMarkAsPaid}
                className={`h-10 rounded-lg text-[11px] font-bold transition-all ${
                  status === "paid"
                    ? "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-800 dark:text-green-100 shadow-[0_2px_8px_0_rgba(34,197,94,0.25)] border-2 border-green-400 dark:border-green-600"
                    : "bg-green-50/30 dark:bg-green-950/20 text-green-600/60 dark:text-green-400/60 border border-green-300/50 dark:border-green-700/50 active:bg-green-50/50 dark:active:bg-green-950/30"
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
                    className="flex-1 h-10 text-sm rounded-lg bg-background border-orange-300 dark:border-orange-700 focus-visible:ring-orange-500"
                  />
                  <button
                    onClick={handleApplyPartial}
                    disabled={!partialAmount || parseFloat(partialAmount) > (currentAmount - dayPaidAmount) || parseFloat(partialAmount) <= 0}
                    className="h-10 px-4 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Додати
                  </button>
                </div>

                {/* Payment Info Display */}
                {dayPaidAmount > 0 && (
                  <div className="bg-orange-50/50 dark:bg-orange-950/30 rounded-lg p-2.5">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Оплачено:</span>
                        <span className="font-bold text-foreground">{Math.round(dayPaidAmount)}€</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-orange-600 dark:text-orange-400 font-medium">Залишок:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{Math.round(currentAmount - dayPaidAmount)}€</span>
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
          <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Дата</p>
            <div className="relative">
              <span className="text-lg font-bold text-foreground group-hover:text-blue-600 transition-colors">
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
        {(editNote || true) && (
          <div>
            <Textarea
              value={editNote}
              onChange={(e) => {
                setEditNote(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="📝 Нотатка..."
              className="min-h-[80px] resize-none text-sm bg-background border border-border rounded-lg px-3 py-2.5 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all placeholder:text-muted-foreground"
            />
          </div>
        )}

        {/* Delete Report Button */}
        <button
          onClick={handleDeleteReport}
          className="w-full flex items-center justify-center gap-1.5 text-muted-foreground active:text-red-600 dark:active:text-red-400 transition-colors py-2.5 rounded-lg active:bg-red-50 dark:active:bg-red-950/30"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-xs font-semibold">Видалити звіт</span>
        </button>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default WorkDayDetails;
