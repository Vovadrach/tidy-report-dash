import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Clock, CurrencyEur as Euro, Trash as Trash2, CalendarBlank as Calendar } from "@phosphor-icons/react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { TimePickerWheel } from "@/components/TimePickerWheel";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useClients, useDeleteReport, useSetPayment, useUpdateWorkDayFields, useWorkDays } from "@/data/queries";
import { decimalToHours, hoursToDecimal } from "@/domain/time";
import { applyPartialPayment } from "@/domain/money";
import { formatFullDate } from "@/domain/dates";
import type { PaymentStatus } from "@/domain/types";
import { ScreenSkeleton } from "@/ui/Skeleton";
import { SaveIndicator } from "@/ui/SaveIndicator";

const WorkDayDetails = () => {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { data: workDays = [], isLoading } = useWorkDays();
  const { data: clients = [] } = useClients();
  const updateFields = useUpdateWorkDayFields();
  const setPayment = useSetPayment();
  const deleteReport = useDeleteReport();

  const workDay = useMemo(() => workDays.find((d) => d.id === dayId), [workDays, dayId]);
  const client = useMemo(
    () => clients.find((c) => c.id === workDay?.clientId),
    [clients, workDay],
  );

  const [editDate, setEditDate] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editNote, setEditNote] = useState("");
  const [partialAmount, setPartialAmount] = useState("");
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Ініціалізація полів з даних (один раз на день)
  const initializedFor = useRef<string | null>(null);
  useEffect(() => {
    if (workDay && initializedFor.current !== workDay.id) {
      initializedFor.current = workDay.id;
      setEditDate(workDay.date);
      setEditHours(decimalToHours(workDay.hours));
      setEditNote(workDay.note ?? "");
    }
  }, [workDay]);

  const hourlyRate = client?.hourlyRate ?? 0;
  const currentHours = editHours ? hoursToDecimal(editHours) : workDay?.hours ?? 0;
  const currentAmount = currentHours * hourlyRate;

  // Дебаунс-збереження змін полів (замість магії на unmount)
  const dirty = useRef(false);
  useEffect(() => {
    if (!workDay || initializedFor.current !== workDay.id) return;
    const changed =
      editDate !== workDay.date ||
      Math.abs(currentHours - workDay.hours) > 1e-9 ||
      editNote !== (workDay.note ?? "");
    if (!changed) return;
    dirty.current = true;
    const t = setTimeout(() => {
      dirty.current = false;
      updateFields.mutate({
        dayId: workDay.id,
        patch: {
          date: editDate,
          hours: currentHours,
          amount: currentHours * hourlyRate,
          note: editNote || null,
          isPlanned: currentHours > 0 ? false : workDay.isPlanned,
        },
      });
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDate, editHours, editNote]);

  if (isLoading) {
    return <ScreenSkeleton />;
  }

  if (!workDay) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Дані не знайдено</p>
      </div>
    );
  }

  const status = workDay.status;

  const handleSetStatus = (next: PaymentStatus) => {
    setPayment.mutate({
      dayId: workDay.id,
      status: next,
      paidAmount: next === "paid" ? currentAmount : next === "unpaid" ? 0 : workDay.paidAmount,
    });
    if (next !== "partial") setPartialAmount("");
  };

  const handleApplyPartial = () => {
    const result = applyPartialPayment(
      { amount: currentAmount, paidAmount: workDay.paidAmount },
      parseFloat(partialAmount),
    );
    if (!result.ok) {
      toast.error(result.error === "exceeds" ? "Сума не може перевищувати загальну вартість" : "Введіть коректну суму");
      return;
    }
    setPayment.mutate({ dayId: workDay.id, status: result.status, paidAmount: result.paidAmount });
    setPartialAmount("");
    toast.success("Часткову оплату додано", { duration: 2000 });
  };

  const handleDelete = () => {
    deleteReport.mutate(workDay.reportId, { onSuccess: () => navigate("/") });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-40 app-bar">
        <div className="container mx-auto px-4 py-3">
          <div className="relative text-center mb-3">
            <h1 className="display text-xl text-foreground">{client?.name ?? workDay.clientName}</h1>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <SaveIndicator saving={updateFields.isPending} savedAtLeastOnce={updateFields.isSuccess} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div
              onClick={() => setIsTimePickerOpen(true)}
              className="stat-tile stat-tile-time cursor-pointer active:scale-95 transition-transform"
            >
              <div className="icon-badge icon-badge-time w-9 h-9">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="caption-label mb-0.5 truncate">Години</p>
                <div className="flex items-baseline gap-1">
                  <p className="display text-xl text-foreground leading-none truncate">{decimalToHours(currentHours)}</p>
                  <p className="text-xs font-bold text-muted-foreground/70 flex-shrink-0">год</p>
                </div>
              </div>
            </div>

            <div className="stat-tile stat-tile-money">
              <div className="icon-badge icon-badge-money w-9 h-9">
                <Euro className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="caption-label mb-0.5 truncate">Сума</p>
                <div className="flex items-baseline gap-1">
                  <p className="display text-xl text-foreground leading-none truncate">{Math.round(currentAmount)}</p>
                  <p className="text-xs font-bold text-muted-foreground/70 flex-shrink-0">€</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isTimePickerOpen && (
        <TimePickerWheel
          value={editHours}
          onChange={(value) => {
            setEditHours(value);
            setIsTimePickerOpen(false);
          }}
          placeholder="0:00"
          hourlyRate={hourlyRate}
        />
      )}

      <main className="container mx-auto px-4 pt-[130px] pb-dock max-w-4xl space-y-3">
        {/* Payment Status Card */}
        <div className="surface-card p-3">
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleSetStatus("partial")}
                className={`h-10 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                  status === "partial"
                    ? "bg-warning/12 text-warning border-2 border-warning/60 shadow-sm"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-warning/5"
                }`}
              >
                Частково
              </button>

              <button
                onClick={() => handleSetStatus("unpaid")}
                className={`h-10 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                  status === "unpaid"
                    ? "bg-destructive/12 text-destructive border-2 border-destructive/60 shadow-sm"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-destructive/5"
                }`}
              >
                Не оплачено
              </button>

              <button
                onClick={() => handleSetStatus("paid")}
                className={`h-10 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
                  status === "paid"
                    ? "bg-success/12 text-success border-2 border-success/60 shadow-sm"
                    : "bg-transparent text-muted-foreground border border-border hover:bg-success/5"
                }`}
              >
                Оплачено
              </button>
            </div>

            {status === "partial" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Додати суму"
                    className="flex-1 h-10 text-sm rounded-xl bg-background border-warning/40 focus-visible:ring-warning"
                  />
                  <button
                    onClick={handleApplyPartial}
                    disabled={!partialAmount || parseFloat(partialAmount) <= 0}
                    className="h-10 px-4 rounded-full text-xs font-bold bg-warning hover:bg-warning/90 text-warning-foreground transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Додати
                  </button>
                </div>

                {workDay.paidAmount > 0 && (
                  <div className="bg-warning/8 rounded-xl p-2.5">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Оплачено:</span>
                        <span className="font-bold text-foreground tabular-nums">{Math.round(workDay.paidAmount)}€</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-warning font-medium">Залишок:</span>
                        <span className="font-bold text-warning tabular-nums">{Math.round(currentAmount - workDay.paidAmount)}€</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Workers List */}
        {workDay.assignments.length > 0 && (
          <div className="space-y-1.5">
            {workDay.assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center gap-2 py-2">
                <div className="w-1 h-10 rounded-full" style={{ backgroundColor: assignment.workerColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{assignment.workerName}</p>
                  {workDay.assignments.length > 1 && (
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground tabular-nums">{decimalToHours(assignment.hours)} год</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs font-semibold text-foreground tabular-nums">{Math.round(assignment.amount)}€</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
                {editDate ? formatFullDate(editDate) : "Оберіть дату"}
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
                onChange={(e) => setEditDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Note */}
        <div>
          <Textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="📝 Нотатка..."
            className="min-h-[80px] resize-none text-sm bg-card border border-border rounded-xl px-3 py-2.5 shadow-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all placeholder:text-muted-foreground"
          />
        </div>

        {/* Delete Button */}
        <button
          onClick={() => setIsDeleteDialogOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 text-destructive/80 hover:text-destructive transition-colors py-3 rounded-xl border border-destructive/20 hover:bg-destructive/5 active:scale-[0.98]"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-xs font-bold">Видалити запис</span>
        </button>
      </main>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="w-[calc(100%-3rem)] max-w-md rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити запис?</AlertDialogTitle>
            <AlertDialogDescription>
              Запис буде видалено назавжди. Цю дію неможливо скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
