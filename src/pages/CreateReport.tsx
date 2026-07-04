import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarBlank as Calendar, Plus, CurrencyEur as Euro, UsersThree as Users, Note as FileText, Trash as Trash2, FloppyDisk as Save } from "@phosphor-icons/react";
import { toast } from "sonner";
import { HomeDock } from "@/components/HomeDock";
import { WorkerAssignmentDialog } from "@/components/WorkerAssignmentDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useClients, useCreateWorkEntry, useDeleteReport, useReplaceAssignments,
  useUpdateWorkDayFields, useWorkDays, useWorkers,
} from "@/data/queries";
import { todayLocal } from "@/domain/dates";
import { validateSplit } from "@/domain/money";
import type { NewAssignment, PaymentStatus } from "@/domain/types";

const CreateReport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: clients = [] } = useClients();
  const { data: workers = [] } = useWorkers();
  const { data: workDays = [] } = useWorkDays();
  const createEntry = useCreateWorkEntry();
  const updateFields = useUpdateWorkDayFields();
  const replaceAssignments = useReplaceAssignments();
  const deleteReport = useDeleteReport();

  const [selectedClientId, setSelectedClientId] = useState("");
  const [reportDate, setReportDate] = useState(todayLocal());
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [workPaymentStatus, setWorkPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [partialAmount, setPartialAmount] = useState("");
  const [customHourlyRate, setCustomHourlyRate] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [amountManuallyEntered, setAmountManuallyEntered] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [workerAmounts, setWorkerAmounts] = useState<Record<string, string>>({});
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);

  const [workNote, setWorkNote] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Редагування запланованого запису
  const editingWorkDayId = searchParams.get("workDayId");
  const editingReportId = searchParams.get("reportId");
  const editingDay = useMemo(
    () => (editingWorkDayId ? workDays.find((d) => d.id === editingWorkDayId) : undefined),
    [workDays, editingWorkDayId],
  );

  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const hoursScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minutesScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clientIdFromUrl = searchParams.get("clientId");
    if (clientIdFromUrl) setSelectedClientId(clientIdFromUrl);
    const date = searchParams.get("date");
    if (date) setReportDate(date);
  }, [searchParams]);

  useEffect(() => {
    if (editingDay) {
      setWorkNote(editingDay.note ?? "");
      setReportDate(editingDay.date);
    }
  }, [editingDay]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Дефолтна ставка при виборі клієнта
  useEffect(() => {
    if (selectedClient) setCustomHourlyRate(selectedClient.hourlyRate.toString());
    else setCustomHourlyRate("");
  }, [selectedClient]);

  const getRate = useCallback(
    () => (customHourlyRate ? parseFloat(customHourlyRate) : selectedClient?.hourlyRate ?? 0),
    [customHourlyRate, selectedClient],
  );

  const hoursArray = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutesArray = useMemo(() => [0, 10, 20, 30, 40, 50], []);

  const calculateEarnings = useCallback(() => {
    if (!selectedClientId) return 0;
    return Math.round((hours + minutes / 60) * getRate());
  }, [selectedClientId, hours, minutes, getRate]);

  const buildAssignments = (totalAmount: number, totalHours: number): NewAssignment[] => {
    if (selectedWorkers.length > 0) {
      const rate = getRate();
      return selectedWorkers.map((workerId) => {
        const amount = parseFloat(workerAmounts[workerId] || "0");
        return { workerId, amount, hours: rate > 0 ? amount / rate : 0 };
      });
    }
    const primary = workers.find((w) => w.isPrimary) ?? workers[0];
    if (!primary) return [];
    return [{ workerId: primary.id, amount: totalAmount, hours: totalHours }];
  };

  const handleDelete = () => {
    if (!editingReportId) return;
    deleteReport.mutate(editingReportId, { onSuccess: () => navigate("/") });
  };

  const handleSaveNote = () => {
    if (!editingWorkDayId) return;
    updateFields.mutate(
      { dayId: editingWorkDayId, patch: { note: workNote || null } },
      { onSuccess: () => toast.success("Нотатку збережено", { duration: 2000 }) },
    );
  };

  const handlePlanWork = () => {
    if (!selectedClient) {
      toast.error("Оберіть клієнта");
      return;
    }
    createEntry.mutate(
      {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        date: reportDate,
        hours: 0,
        amount: 0,
        status: "unpaid",
        paidAmount: 0,
        isPlanned: true,
        note: workNote || undefined,
        assignments: [],
      },
      {
        onSuccess: () => {
          toast.success("Роботу заплановано");
          navigate("/");
        },
      },
    );
  };

  const resolveFinalHours = (): number => {
    if (amountInput && amountManuallyEntered) {
      const amount = parseFloat(amountInput);
      const rate = getRate();
      if (!isNaN(amount) && rate > 0) return amount / rate;
    }
    return hours + minutes / 60;
  };

  const handleCreateOrSave = () => {
    if (!selectedClient) {
      toast.error("Оберіть клієнта");
      return;
    }

    const finalHours = resolveFinalHours();
    const rate = getRate();
    const amount = finalHours * rate;

    if (workPaymentStatus === "partial" && partialAmount && parseFloat(partialAmount) > amount) {
      toast.error(`Сума не може бути більшою за ${Math.round(amount)}€`);
      return;
    }

    if (selectedWorkers.length > 0) {
      const split = validateSplit(
        calculateEarnings(),
        selectedWorkers.map((id) => ({ workerId: id, amount: parseFloat(workerAmounts[id] || "0") })),
      );
      if (!split.valid) {
        toast.error(
          split.emptyWorkerIds.length > 0
            ? "Введіть суму для кожної працівниці"
            : `Розподіліть всю суму. Залишок: ${Math.round(split.remainder)}€`,
        );
        return;
      }
    }

    const paidAmount =
      workPaymentStatus === "paid" ? amount :
      workPaymentStatus === "partial" ? parseFloat(partialAmount) || 0 : 0;

    if (editingWorkDayId) {
      // Перетворення запланованого запису на робочий
      updateFields.mutate(
        {
          dayId: editingWorkDayId,
          patch: { date: reportDate, hours: finalHours, amount, isPlanned: false, note: workNote || null },
        },
        {
          onSuccess: () => {
            replaceAssignments.mutate(
              { dayId: editingWorkDayId, assignments: buildAssignments(amount, finalHours) },
              {
                onSuccess: () => {
                  toast.success("Запис оновлено", { duration: 2000 });
                  navigate("/");
                },
              },
            );
          },
        },
      );
      return;
    }

    createEntry.mutate(
      {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        date: reportDate,
        hours: finalHours,
        amount,
        status: workPaymentStatus,
        paidAmount,
        isPlanned: false,
        note: workNote || undefined,
        assignments: buildAssignments(amount, finalHours),
      },
      {
        onSuccess: () => {
          toast.success("Запис створено", { duration: 2000 });
          navigate("/");
        },
      },
    );
  };

  // Сума ← час
  useEffect(() => {
    const rate = getRate();
    if (rate > 0 && !isAmountFocused) {
      setAmountInput(Math.round((hours + minutes / 60) * rate).toString());
    }
  }, [hours, minutes, getRate, isAmountFocused]);

  const handleScroll = useCallback((
    ref: React.RefObject<HTMLDivElement | null>,
    items: number[],
    setter: (value: number) => void,
    timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  ) => {
    if (!ref.current) return;
    const itemHeight = 40;
    const centerIndex = Math.round(ref.current.scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(centerIndex, items.length - 1));

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!ref.current) return;
      setter(items[clampedIndex]);
      setAmountManuallyEntered(false);
      const targetScroll = clampedIndex * itemHeight;
      if (Math.abs(ref.current.scrollTop - targetScroll) > 2) {
        ref.current.scrollTo({ top: targetScroll, behavior: "smooth" });
      }
    }, 150);
  }, []);

  const handleAmountChange = (newAmount: string) => {
    setAmountInput(newAmount);
    setAmountManuallyEntered(true);
    if (newAmount && !isNaN(parseFloat(newAmount))) {
      const rate = getRate();
      if (rate > 0) {
        const totalHours = parseFloat(newAmount) / rate;
        const h = Math.floor(totalHours);
        const m = Math.round(((totalHours - h) * 60) / 10) * 10;
        setHours(Math.min(m >= 60 ? h + 1 : h, 23));
        setMinutes(m >= 60 ? 0 : m);
      }
    }
  };

  const isPending = createEntry.isPending || updateFields.isPending;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-40 app-bar">
        <div className="container mx-auto px-4 py-2.5">
          <h1 className="num-display text-xl text-foreground text-center">
            {selectedClient?.name || "Завантаження..."}
          </h1>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-20 pb-dock-sm max-w-md">
        <div className="space-y-3">
          {/* Date Card */}
          <div className="surface-card p-3">
            <div className="flex items-center gap-2">
              <div className="icon-badge icon-badge-ok w-8 h-8 rounded-full">
                <Calendar className="w-4 h-4" />
              </div>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="flex-1 h-8 rounded-md border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-medium"
              />
            </div>
          </div>

          {/* Time & Rate Card */}
          <div className="surface-card overflow-hidden">
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center justify-between px-2">
                <div className="relative flex-1">
                  <div className="relative h-[120px] w-full">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] border-y-2 border-primary/30 bg-primary/5 pointer-events-none z-10 rounded-md" />
                    <div
                      ref={hoursRef}
                      className="h-full overflow-y-auto scrollbar-hide"
                      onScroll={() => handleScroll(hoursRef, hoursArray, setHours, hoursScrollTimeout)}
                      style={{ paddingTop: "40px", paddingBottom: "40px", scrollBehavior: "auto" }}
                    >
                      {hoursArray.map((hour) => (
                        <div
                          key={hour}
                          className="h-[40px] flex items-center justify-center text-lg font-bold transition-all duration-150"
                          style={{
                            opacity: hour === hours ? 1 : 0.25,
                            transform: hour === hours ? "scale(1.05)" : "scale(0.85)",
                          }}
                        >
                          {hour}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-2xl font-bold text-primary px-3">:</div>

                <div className="relative flex-1">
                  <div className="relative h-[120px] w-full">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] border-y-2 border-primary/30 bg-primary/5 pointer-events-none z-10 rounded-md" />
                    <div
                      ref={minutesRef}
                      className="h-full overflow-y-auto scrollbar-hide"
                      onScroll={() => handleScroll(minutesRef, minutesArray, setMinutes, minutesScrollTimeout)}
                      style={{ paddingTop: "40px", paddingBottom: "40px", scrollBehavior: "auto" }}
                    >
                      {minutesArray.map((minute) => (
                        <div
                          key={minute}
                          className="h-[40px] flex items-center justify-center text-lg font-bold transition-all duration-150"
                          style={{
                            opacity: minute === minutes ? 1 : 0.25,
                            transform: minute === minutes ? "scale(1.05)" : "scale(0.85)",
                          }}
                        >
                          {minute.toString().padStart(2, "0")}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3">
              <div className="flex gap-3">
                {selectedClientId && getRate() > 0 && (
                  <div className="flex-[2] flex flex-col">
                    <div className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wide text-center">
                      Сума
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        value={amountInput}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        onFocus={() => { setIsAmountFocused(true); setAmountInput(""); }}
                        onBlur={() => {
                          setIsAmountFocused(false);
                          if (!amountInput && getRate() > 0) {
                            setAmountInput(Math.round((hours + minutes / 60) * getRate()).toString());
                          }
                        }}
                        className="h-10 text-center text-base font-bold rounded-md pr-7"
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                        <Euro className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1 flex flex-col">
                  <div className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wide text-center">
                    Ставка
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      value={customHourlyRate}
                      onChange={(e) => setCustomHourlyRate(e.target.value)}
                      placeholder="0"
                      className="h-10 text-center text-base font-normal rounded-md pr-7"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                      <Euro className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Worker Assignment Button */}
          {(hours > 0 || minutes > 0) && selectedClientId && workers.length > 0 && (
            <button
              onClick={() => setWorkerDialogOpen(true)}
              className="w-full surface-card surface-card-hover p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                <span className="text-sm font-bold">
                  {selectedWorkers.length > 0
                    ? `Працівниці (${selectedWorkers.length})`
                    : "Додати працівниць"}
                </span>
              </div>
              {selectedWorkers.length > 0 && (
                <div className="flex -space-x-2">
                  {selectedWorkers.slice(0, 3).map((workerId) => {
                    const worker = workers.find((w) => w.id === workerId);
                    if (!worker) return null;
                    return (
                      <div
                        key={workerId}
                        className="w-6 h-6 rounded-full border-2 border-card"
                        style={{ backgroundColor: worker.color }}
                      />
                    );
                  })}
                </div>
              )}
            </button>
          )}

          <WorkerAssignmentDialog
            open={workerDialogOpen}
            onOpenChange={setWorkerDialogOpen}
            workers={workers}
            selectedWorkers={selectedWorkers}
            workerAmounts={workerAmounts}
            totalAmount={calculateEarnings()}
            onWorkersChange={(w, a) => { setSelectedWorkers(w); setWorkerAmounts(a); }}
          />

          {/* Payment Status */}
          {(hours > 0 || minutes > 0) && selectedClientId && (
            <div className="surface-card p-3">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setWorkPaymentStatus("paid")}
                  className={`h-10 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    workPaymentStatus === "paid"
                      ? "bg-success/12 text-success border-2 border-success/60 shadow-sm"
                      : "bg-transparent text-muted-foreground border border-border hover:bg-success/5"
                  }`}
                >
                  Оплачено
                </button>

                <button
                  onClick={() => setWorkPaymentStatus("unpaid")}
                  className={`h-10 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    workPaymentStatus === "unpaid"
                      ? "bg-destructive/12 text-destructive border-2 border-destructive/60 shadow-sm"
                      : "bg-transparent text-muted-foreground border border-border hover:bg-destructive/5"
                  }`}
                >
                  Не оплачено
                </button>

                <button
                  onClick={() => setWorkPaymentStatus("partial")}
                  className={`h-10 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    workPaymentStatus === "partial"
                      ? "bg-warning/12 text-warning border-2 border-warning/60 shadow-sm"
                      : "bg-transparent text-muted-foreground border border-border hover:bg-warning/5"
                  }`}
                >
                  Частково
                </button>
              </div>

              {workPaymentStatus === "partial" && (
                <div className="mt-2 relative">
                  <Input
                    type="number"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Введіть суму"
                    className="h-9 pr-8 text-center font-medium rounded-md"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Euro className="w-4 h-4 text-warning" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Note Field */}
          {selectedClientId && (
            <div className="surface-card p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Нотатка
                  </label>
                </div>
                {editingWorkDayId && (
                  <Button onClick={handleSaveNote} size="sm" className="h-7 px-2 text-xs gap-1">
                    <Save className="w-3 h-3" />
                    Зберегти
                  </Button>
                )}
              </div>
              <Textarea
                value={workNote}
                onChange={(e) => setWorkNote(e.target.value)}
                placeholder="Додайте коментар або нотатку..."
                className="min-h-[80px] text-sm resize-none rounded-md"
              />
            </div>
          )}

          {/* Дії */}
          {hours === 0 && minutes === 0 && (!amountInput || amountInput === "0") ? (
            editingWorkDayId ? (
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full h-12 text-sm font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Видалити запис
              </Button>
            ) : (
              <button
                onClick={handlePlanWork}
                disabled={!selectedClientId || createEntry.isPending}
                className="w-full h-12 text-sm font-bold rounded-full border-2 border-dashed border-warning/50 bg-warning/8 hover:bg-warning/12 text-warning transition-all active:scale-[0.98] shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Calendar className="w-4 h-4" />
                Запланувати роботу
              </button>
            )
          ) : (
            <div className="flex gap-2">
              {editingWorkDayId && (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="h-12 px-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="default"
                size="lg"
                onClick={handleCreateOrSave}
                className={`h-12 text-sm font-bold gradient-primary hover:opacity-95 shadow-md hover:shadow-lg ${editingWorkDayId ? "flex-1" : "w-full"}`}
                disabled={
                  isPending ||
                  !selectedClientId ||
                  (hours === 0 && minutes === 0) ||
                  (workPaymentStatus === "partial" && !partialAmount) ||
                  (workPaymentStatus === "partial" && !!partialAmount && parseFloat(partialAmount) > calculateEarnings())
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                {editingWorkDayId ? "Зберегти запис" : "Створити запис"}
              </Button>
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="w-[calc(100%-3rem)] max-w-md rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити запис?</AlertDialogTitle>
            <AlertDialogDescription>
              Запланований запис буде видалено назавжди. Цю дію неможливо скасувати.
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

      <HomeDock />
    </div>
  );
};

export default CreateReport;
