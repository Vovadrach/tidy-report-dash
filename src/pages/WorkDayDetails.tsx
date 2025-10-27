import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { Report, WorkDay, Client, PaymentStatus } from "@/types/report";
import { Clock, Euro, CheckCircle2, XCircle, AlertCircle, Trash2, ArrowLeft, Calendar, Pencil } from "lucide-react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";

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
        const hours = parseFloat(editHoursRef.current);
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
          setEditHours(day.hours.toString());
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
      const hours = parseFloat(editHours);
      const hourlyRate = client.hourlyRate || client.hourly_rate || 0;
      const amount = hours * hourlyRate;

      await api.updateWorkDay(workDay.id, {
        date: editDate,
        hours,
        amount,
        note: editNote,
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
    const hours = editHours ? parseFloat(editHours) : workDay.hours;
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

  const getPaymentIcon = (status: WorkDay["paymentStatus"]) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="w-6 h-6 text-success" />;
      case "partial":
        return <AlertCircle className="w-6 h-6 text-warning" />;
      case "unpaid":
        return <XCircle className="w-6 h-6 text-destructive" />;
    }
  };

  const getPaymentColor = (status: WorkDay["paymentStatus"]) => {
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
  const currentHours = editHours ? parseFloat(editHours) : workDay.hours;
  const hourlyRate = client?.hourlyRate || client?.hourly_rate || 0;
  const currentAmount = currentHours * hourlyRate;

  return (
    <div className="min-h-screen bg-background pb-32 pt-4">
      {/* Fixed top section with glassmorphism */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl border-b border-white/10 shadow-[0_2px_16px_0_rgba(31,38,135,0.1)]">
        <div className="container mx-auto px-4 py-4">
          {/* Client Name */}
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold text-foreground">{client.name}</h1>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Години блок */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 p-4 shadow-sm border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 border border-purple-200 dark:border-purple-800">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Години</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-xl font-bold text-black dark:text-white">{currentHours}</p>
                    <p className="text-sm font-semibold text-black dark:text-white">год</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Сума блок */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 p-4 shadow-sm border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 border border-blue-200 dark:border-blue-800">
                  <Euro className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Сума</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-xl font-bold text-black dark:text-white">{Math.round(currentAmount)}</p>
                    <p className="text-sm font-semibold text-black dark:text-white">€</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-40 max-w-4xl space-y-4">
        {/* Stats Card */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">

          {/* Payment Status Selector */}
          <div className="space-y-2">
            {/* Three Button Layout */}
            <div className="grid grid-cols-3 gap-2">
              {/* Partial Button - LEFT */}
              <button
                onClick={handleSetPartial}
                className={`h-12 rounded-xl text-sm font-semibold transition-all backdrop-blur-sm ${
                  status === "partial"
                    ? "bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 text-orange-800 dark:text-orange-100 shadow-[0_4px_16px_0_rgba(249,115,22,0.25)] border-2 border-orange-400 dark:border-orange-600"
                    : "bg-orange-50/30 dark:bg-orange-950/20 text-orange-600/60 dark:text-orange-400/60 border border-orange-300/50 dark:border-orange-700/50 hover:bg-orange-50/50 dark:hover:bg-orange-950/30 hover:border-orange-400/70 dark:hover:border-orange-600/70"
                }`}
              >
                Частково
              </button>

              {/* Unpaid Button - CENTER */}
              <button
                onClick={handleSetUnpaid}
                className={`h-12 rounded-xl text-sm font-semibold transition-all backdrop-blur-sm ${
                  status === "unpaid"
                    ? "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 text-red-800 dark:text-red-100 shadow-[0_4px_16px_0_rgba(239,68,68,0.25)] border-2 border-red-400 dark:border-red-600"
                    : "bg-red-50/30 dark:bg-red-950/20 text-red-600/60 dark:text-red-400/60 border border-red-300/50 dark:border-red-700/50 hover:bg-red-50/50 dark:hover:bg-red-950/30 hover:border-red-400/70 dark:hover:border-red-600/70"
                }`}
              >
                Не оплачено
              </button>

              {/* Paid Button - RIGHT */}
              <button
                onClick={handleMarkAsPaid}
                className={`h-12 rounded-xl text-sm font-semibold transition-all backdrop-blur-sm ${
                  status === "paid"
                    ? "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-800 dark:text-green-100 shadow-[0_4px_16px_0_rgba(34,197,94,0.25)] border-2 border-green-400 dark:border-green-600"
                    : "bg-green-50/30 dark:bg-green-950/20 text-green-600/60 dark:text-green-400/60 border border-green-300/50 dark:border-green-700/50 hover:bg-green-50/50 dark:hover:bg-green-950/30 hover:border-green-400/70 dark:hover:border-green-600/70"
                }`}
              >
                Оплачено
              </button>
            </div>

            {/* Partial Payment Input - always visible when status is partial */}
            {status === "partial" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Додати суму"
                    max={currentAmount - dayPaidAmount}
                    className="col-span-2 h-12 text-sm rounded-xl bg-background border-orange-300 dark:border-orange-700 focus-visible:ring-orange-500"
                  />
                  <button
                    onClick={() => {
                      handleApplyPartial();
                    }}
                    disabled={!partialAmount || parseFloat(partialAmount) > (currentAmount - dayPaidAmount) || parseFloat(partialAmount) <= 0}
                    className="h-12 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Додати
                  </button>
                </div>

                {/* Payment Info Display */}
                {dayPaidAmount > 0 && (
                  <div className="bg-orange-50/50 dark:bg-orange-950/30 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Оплачено:</span>
                        <span className="font-semibold text-foreground">{Math.round(dayPaidAmount)}€</span>
                      </div>
                      <div className="flex items-center gap-1.5">
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

        {/* Edit Form */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block text-center text-foreground">Дата</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => {
                  setEditDate(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="rounded-lg h-10 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1.5 block text-center text-foreground">Години</Label>
              <Input
                type="number"
                step="0.5"
                value={editHours}
                onChange={(e) => {
                  setEditHours(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="8"
                className="rounded-lg h-10 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 flex items-center justify-center gap-2 text-foreground">
              <Pencil className="w-4 h-4" />
              Нотатка
            </Label>
            <Textarea
              value={editNote}
              onChange={(e) => {
                setEditNote(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Додаткова інформація"
              className="min-h-[100px] resize-none rounded-lg border-2 border-blue-200/60 dark:border-blue-700/60 focus-visible:border-blue-400 dark:focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-400/20 dark:focus-visible:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {/* Delete Report Button */}
        <button
          onClick={handleDeleteReport}
          className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors py-3"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm font-medium">Видалити звіт</span>
        </button>
      </main>

      {/* Bottom Navigation - оновлено */}
      <BottomNavigation />
    </div>
  );
};

export default WorkDayDetails;
