import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Client, Report, WorkDay, PaymentStatus } from "@/types/report";
import {
  Clock, ArrowLeft, Users, Trash2, CalendarClock, CircleCheck, CircleDashed, Circle, Save, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { WorkerAssignmentDialog } from "@/components/WorkerAssignmentDialog";
import { useWorker } from "@/contexts/WorkerContext";

const hoursToDecimal = (s: string): number => {
  if (!s) return 0;
  if (s.includes(":")) {
    const [h, m] = s.split(":").map((x) => parseInt(x) || 0);
    return Math.round((h * 60 + m) * 100) / 6000;
  }
  return parseFloat(s) || 0;
};
const decimalToHours = (d: number): string => {
  if (!d) return "";
  const tm = Math.round(d * 60);
  const h = Math.floor(tm / 60);
  const m = tm % 60;
  return m === 0 ? `${h}` : `${h}:${m.toString().padStart(2, "0")}`;
};

const STATUS = [
  { key: "paid", label: "Оплачено", icon: CircleCheck, tint: "tint-emerald", ring: "ring-[hsl(var(--t-emerald-fg))]" },
  { key: "partial", label: "Частково", icon: CircleDashed, tint: "tint-amber", ring: "ring-[hsl(var(--t-amber-fg))]" },
  { key: "unpaid", label: "Не оплачено", icon: Circle, tint: "tint-rose", ring: "ring-[hsl(var(--t-rose-fg))]" },
] as const;

export default function CreateReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { workers, addWorker } = useWorker();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
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
  const [isPlanned] = useState(false);
  const [workNote, setWorkNote] = useState("");
  const [editingWorkDayId, setEditingWorkDayId] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  useEffect(() => { loadClients(); }, []);

  useEffect(() => {
    const c = searchParams.get("clientId");
    if (c) setSelectedClientId(c);
  }, [searchParams]);

  useEffect(() => {
    const workDayId = searchParams.get("workDayId");
    const reportId = searchParams.get("reportId");
    const date = searchParams.get("date");
    if (workDayId && reportId) {
      setEditingWorkDayId(workDayId);
      setEditingReportId(reportId);
      api.getWorkDay(reportId, workDayId).then((wd) => {
        if (wd) { setWorkNote(wd.note || ""); setReportDate(wd.date); }
      }).catch((e) => { console.error(e); toast.error("Помилка завантаження"); });
    } else if (date) setReportDate(date);
  }, [searchParams]);

  useEffect(() => {
    if (selectedClientId && clients.length > 0) setCustomHourlyRate(String(getDefaultHourlyRate()));
    else if (!selectedClientId) setCustomHourlyRate("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, clients]);

  const loadClients = async () => {
    try { setClients(await api.getClients()); } catch (e) { toast.error("Помилка завантаження клієнтів"); console.error(e); }
  };

  const getClientHourlyRate = () => {
    if (customHourlyRate) return parseFloat(customHourlyRate) || 0;
    const c = clients.find((x) => x.id === selectedClientId);
    return c ? c.hourlyRate || c.hourly_rate || 0 : 0;
  };
  const getDefaultHourlyRate = () => {
    const c = clients.find((x) => x.id === selectedClientId);
    return c ? c.hourlyRate || c.hourly_rate || 0 : 0;
  };
  const calculateEarnings = () => {
    if (!selectedClientId) return 0;
    return Math.round((hours + minutes / 60) * getClientHourlyRate());
  };

  const handleWorkersChange = (nw: string[], na: Record<string, string>) => {
    setSelectedWorkers(nw);
    setWorkerAmounts(na);
  };
  const handleAddWorkerInDialog = async (name: string) => {
    try {
      const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
      await addWorker({ name, color: colors[Math.floor(name.length) % colors.length], is_primary: false });
      toast.success("Працівницю додано");
    } catch (e) { toast.error("Помилка"); console.error(e); }
  };
  const getTotalAssignedAmount = () => selectedWorkers.reduce((s, id) => s + (parseFloat(workerAmounts[id] || "0") || 0), 0);
  const isWorkerAssignmentValid = () => {
    if (selectedWorkers.length === 0) return true;
    if (getTotalAssignedAmount() !== calculateEarnings()) return false;
    return selectedWorkers.every((id) => (parseFloat(workerAmounts[id] || "0") || 0) > 0);
  };

  // sync amount from time
  useEffect(() => {
    const rate = getClientHourlyRate();
    if (rate > 0 && !isAmountFocused) setAmountInput(String(Math.round((hours + minutes / 60) * rate)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, minutes, customHourlyRate, selectedClientId, isAmountFocused]);

  const onTimeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(":").map(Number);
    setHours(h || 0);
    setMinutes(m || 0);
    setAmountManuallyEntered(false);
  };
  const handleAmountChange = (v: string) => {
    setAmountInput(v);
    setAmountManuallyEntered(true);
    const amount = parseFloat(v);
    const rate = getClientHourlyRate();
    if (!isNaN(amount) && rate > 0) {
      const th = amount / rate;
      const h = Math.floor(th);
      const rm = Math.round(((th - h) * 60) / 10) * 10;
      setHours(Math.min(rm >= 60 ? h + 1 : h, 23));
      setMinutes(rm >= 60 ? 0 : rm);
    }
  };

  const finalHours = () => {
    if (amountInput && amountManuallyEntered) {
      const a = parseFloat(amountInput), r = getClientHourlyRate();
      if (!isNaN(a) && r > 0) return a / r;
    }
    return hours + minutes / 60;
  };

  const handlePlanWork = async () => {
    if (!selectedClientId) { toast.error("Оберіть клієнта"); return; }
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;
    try {
      await api.addReport({
        clientId: selectedClientId, clientName: client.name, date: reportDate, status: "in_progress",
        paymentStatus: "unpaid", totalHours: 0, totalEarned: 0, paidAmount: 0, remainingAmount: 0,
        workDays: [{ id: `new-${Date.now()}`, date: reportDate, hours: 0, amount: 0, paymentStatus: "unpaid", day_paid_amount: 0, is_planned: true, note: workNote || undefined }],
      });
      toast.success("Роботу заплановано");
      navigate("/", { viewTransition: true });
    } catch (e) { toast.error("Помилка планування"); console.error(e); }
  };

  const handleDeletePlannedWork = async () => {
    if (!editingWorkDayId) return;
    if (!confirm("Видалити цей запис?")) return;
    try { await api.deleteWorkDay(editingWorkDayId); toast.success("Запис видалено"); navigate("/", { viewTransition: true }); }
    catch (e) { toast.error("Помилка видалення"); console.error(e); }
  };

  const handleSaveNote = async () => {
    if (!editingWorkDayId) return;
    try { await api.updateWorkDay(editingWorkDayId, { note: workNote || null }); toast.success("Нотатку збережено"); }
    catch (e) { toast.error("Помилка"); console.error(e); }
  };

  const assignWorkers = async (workDayId: string, amount: number, fh: number) => {
    await api.deleteWorkDayAssignmentsByWorkDay(workDayId);
    if (selectedWorkers.length > 0) {
      for (const id of selectedWorkers) {
        const a = parseFloat(workerAmounts[id] || "0") || 0;
        await api.addWorkDayAssignment({ work_day_id: workDayId, worker_id: id, amount: a, hours: getClientHourlyRate() > 0 ? a / getClientHourlyRate() : 0 });
      }
    } else {
      const primary = workers.find((w) => w.is_primary || w.isPrimary);
      if (primary) await api.addWorkDayAssignment({ work_day_id: workDayId, worker_id: primary.id, amount, hours: fh });
    }
  };

  const handleCreateReport = async () => {
    if (!selectedClientId) { toast.error("Оберіть клієнта"); return; }
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;
    const fh = finalHours();
    const rate = getClientHourlyRate();
    const amount = fh * rate;

    if (workPaymentStatus === "partial" && partialAmount && parseFloat(partialAmount) > calculateEarnings()) {
      toast.error(`Сума не може бути більшою за ${calculateEarnings()}€`);
      return;
    }
    if (selectedWorkers.length > 0 && getTotalAssignedAmount() !== calculateEarnings()) {
      toast.error(`Розподіліть усю суму (${calculateEarnings()}€)`);
      return;
    }

    const dayPaid = workPaymentStatus === "partial" ? parseFloat(partialAmount) || 0 : workPaymentStatus === "paid" ? amount : 0;

    try {
      if (editingWorkDayId && editingReportId) {
        await api.updateWorkDay(editingWorkDayId, { hours: fh, amount, payment_status: workPaymentStatus, day_paid_amount: dayPaid, is_planned: false, note: workNote || undefined });
        await assignWorkers(editingWorkDayId, amount, fh);
        toast.success("Запис оновлено");
        navigate("/", { viewTransition: true });
        return;
      }
      const paymentStatus: PaymentStatus = dayPaid >= amount && amount > 0 ? "paid" : dayPaid > 0 ? "partial" : "unpaid";
      const newReport = await api.addReport({
        clientId: client.id, clientName: client.name, date: reportDate, status: "in_progress",
        paymentStatus, totalHours: fh, totalEarned: amount, paidAmount: dayPaid, remainingAmount: amount - dayPaid,
        workDays: [{ id: `new-${Date.now()}`, date: reportDate, hours: fh, amount, paymentStatus: workPaymentStatus, day_paid_amount: dayPaid, is_planned: isPlanned, note: workNote || undefined }],
      } as Omit<Report, "id">);
      if (newReport.workDays?.[0]) await assignWorkers(newReport.workDays[0].id, amount, fh);
      toast.success("Запис створено");
      navigate("/", { viewTransition: true });
    } catch (e) { toast.error("Помилка створення"); console.error(e); }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const timeStr = hours || minutes ? `${hours}:${String(minutes).padStart(2, "0")}` : "0:00";
  const hasTime = hours > 0 || minutes > 0;
  const rate = getClientHourlyRate();

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-md items-center gap-3 px-4 pt-3">
        <button type="button" aria-label="Назад" onClick={() => navigate(-1)} className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
          <ArrowLeft size={20} strokeWidth={2.3} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className="ibadge tint-indigo h-10 w-10 font-display text-base font-semibold"
            style={selectedClientId ? { viewTransitionName: `avatar-${selectedClientId}` } : undefined}
          >
            {(selectedClient?.name || "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground">{selectedClient?.name || "Новий запис"}</h1>
            <p className="text-xs text-muted-foreground">{editingWorkDayId ? "Редагування" : "Новий запис"}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pb-32 pt-4">
        {/* Дата */}
        <section className="space-y-1.5">
          <label className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
            <CalendarClock size={15} strokeWidth={2.3} className="text-muted-foreground" /> Дата
          </label>
          <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base font-medium text-foreground outline-none focus:border-primary" />
        </section>

        {/* Години + Сума */}
        <div className="grid grid-cols-2 gap-3">
          <label className="press tint-violet relative block rounded-2xl p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="ibadge h-8 w-8 bg-white/70"><Clock size={16} strokeWidth={2.4} /></span>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider opacity-90">Години</span>
            </div>
            <div className="num-display text-[1.7rem] leading-none text-foreground">{timeStr}</div>
            <input
              type="time"
              aria-label="Години"
              value={`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`}
              onChange={onTimeInput}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          <div className="tint-indigo rounded-2xl p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="ibadge h-8 w-8 bg-white/70"><Wallet size={16} strokeWidth={2.4} /></span>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider opacity-90">Сума</span>
            </div>
            <input
              inputMode="decimal"
              value={amountInput}
              onFocus={() => { setIsAmountFocused(true); setAmountInput(""); }}
              onBlur={() => { setIsAmountFocused(false); if (!amountInput && rate > 0) setAmountInput(String(Math.round((hours + minutes / 60) * rate))); }}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0"
              className="num-display w-full bg-transparent text-[1.7rem] leading-none text-foreground outline-none"
            />
          </div>
        </div>

        {/* Ставка */}
        <section className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Ставка за годину</span>
          <div className="flex items-center gap-1">
            <input inputMode="decimal" value={customHourlyRate} onChange={(e) => setCustomHourlyRate(e.target.value)} placeholder="0"
              className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm font-semibold outline-none focus:border-primary" />
            <span className="text-sm text-muted-foreground">€/год</span>
          </div>
        </section>

        {/* Працівниці */}
        {hasTime && selectedClientId && workers.length > 0 && (
          <button type="button" onClick={() => setWorkerDialogOpen(true)}
            className="press flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users size={17} strokeWidth={2.3} className="text-primary" />
              {selectedWorkers.length > 0 ? `Поділено між ${selectedWorkers.length}` : "Поділити між помічницями"}
            </span>
            <div className="flex -space-x-2">
              {selectedWorkers.slice(0, 3).map((id) => {
                const w = workers.find((x) => x.id === id);
                return w ? <span key={id} className="h-6 w-6 rounded-full ring-2 ring-card" style={{ background: w.color }} /> : null;
              })}
            </div>
          </button>
        )}
        <WorkerAssignmentDialog
          open={workerDialogOpen}
          onOpenChange={setWorkerDialogOpen}
          workers={workers}
          selectedWorkers={selectedWorkers}
          workerAmounts={workerAmounts}
          totalAmount={calculateEarnings()}
          onWorkersChange={handleWorkersChange}
          onAddWorker={handleAddWorkerInDialog}
        />

        {/* Оплата */}
        {hasTime && selectedClientId && (
          <section className="card-flat rounded-2xl p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Оплата</p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS.map((s) => {
                const active = workPaymentStatus === s.key;
                const Icon = s.icon;
                return (
                  <button key={s.key} type="button" onClick={() => setWorkPaymentStatus(s.key)}
                    className="press relative flex flex-col items-center gap-1.5 rounded-xl bg-muted py-3 text-xs font-bold">
                    {active && <motion.span layoutId="createStatusHL" transition={{ type: "spring", stiffness: 430, damping: 34 }} className={`absolute inset-0 rounded-xl ${s.tint} ring-2 ${s.ring}`} />}
                    <span className={`relative z-10 flex flex-col items-center gap-1.5 ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      <Icon size={20} strokeWidth={2.3} /> {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {workPaymentStatus === "partial" && (
              <div className="relative mt-3">
                <input inputMode="decimal" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} placeholder="Отримано, €"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pr-9 text-sm outline-none focus:border-primary" />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              </div>
            )}
          </section>
        )}

        {/* Нотатка */}
        {selectedClientId && (
          <section className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-sm font-semibold text-foreground">Нотатка</label>
              {editingWorkDayId && (
                <button onClick={handleSaveNote} className="press flex items-center gap-1 text-xs font-semibold text-primary">
                  <Save size={13} /> Зберегти
                </button>
              )}
            </div>
            <textarea value={workNote} onChange={(e) => setWorkNote(e.target.value)} placeholder="Що робили, деталі…"
              className="min-h-20 w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
          </section>
        )}
      </main>

      {/* Sticky action */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background to-transparent pt-6">
        <div className="mx-auto flex max-w-md gap-2 px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))]">
          {!hasTime && (!amountInput || amountInput === "0") ? (
            editingWorkDayId ? (
              <button onClick={handleDeletePlannedWork} className="press flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-base font-bold text-destructive">
                <Trash2 size={18} /> Видалити запис
              </button>
            ) : (
              <button onClick={handlePlanWork} disabled={!selectedClientId}
                className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/60 py-4 text-base font-bold text-[hsl(var(--t-amber-fg))] disabled:opacity-50">
                <CalendarClock size={18} /> Запланувати роботу
              </button>
            )
          ) : (
            <>
              {editingWorkDayId && (
                <button onClick={handleDeletePlannedWork} aria-label="Видалити" className="press flex h-[3.6rem] w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-destructive">
                  <Trash2 size={20} />
                </button>
              )}
              <button
                onClick={handleCreateReport}
                disabled={!selectedClientId || !hasTime || (workPaymentStatus === "partial" && !partialAmount) || !isWorkerAssignmentValid()}
                className="press flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground disabled:opacity-50"
              >
                {editingWorkDayId ? "Зберегти запис" : "Створити запис"} · <NumberFlow value={calculateEarnings()} />€
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
