import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Report, WorkDay, Client, PaymentStatus } from "@/types/report";
import {
  Clock, Wallet, Trash2, ArrowLeft, Check, CircleCheck, CircleDashed, Circle,
  Users, StickyNote, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { decimalToHours } from "@/utils/timeFormat";

const hoursToDecimal = (s: string): number => {
  if (!s) return 0;
  if (s.includes(":")) {
    const [h, m] = s.split(":").map((x) => parseInt(x) || 0);
    return h + m / 60;
  }
  return parseFloat(s) || 0;
};

const STATUS = [
  { key: "paid", label: "Оплачено", icon: CircleCheck, tint: "tint-emerald", ring: "ring-[hsl(var(--t-emerald-fg))]" },
  { key: "partial", label: "Частково", icon: CircleDashed, tint: "tint-amber", ring: "ring-[hsl(var(--t-amber-fg))]" },
  { key: "unpaid", label: "Не оплачено", icon: Circle, tint: "tint-rose", ring: "ring-[hsl(var(--t-rose-fg))]" },
] as const;

export default function WorkDayDetails() {
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
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reportId && dayId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, dayId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const reports = await api.getReports();
      const r = reports.find((x) => x.id === reportId);
      if (r) {
        setReport(r);
        const d = r.workDays.find((x) => x.id === dayId);
        if (d) {
          setWorkDay(d);
          setEditDate(d.date);
          setEditHours(decimalToHours(d.hours));
          setEditNote(d.note || "");
          setDayPaidAmount(d.day_paid_amount || 0);
        }
        const clients = await api.getClients();
        setClient(clients.find((c) => c.id === (r.clientId || r.client_id)) || null);
      }
      setDirty(false);
    } catch (e) {
      toast.error("Помилка завантаження");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const rate = client?.hourlyRate || client?.hourly_rate || 0;
  const currentHours = editHours ? hoursToDecimal(editHours) : workDay?.hours || 0;
  const currentAmount = Math.round(currentHours * rate);
  const status = (workDay?.paymentStatus || workDay?.payment_status || "unpaid") as PaymentStatus;

  const save = async () => {
    if (!workDay || !client) return;
    try {
      setSaving(true);
      await api.updateWorkDay(workDay.id, {
        date: editDate,
        hours: currentHours,
        amount: currentHours * rate,
        note: editNote,
        is_planned: currentHours > 0 ? false : workDay.is_planned,
      });
      setWorkDay({ ...workDay, date: editDate, hours: currentHours, amount: currentHours * rate, note: editNote });
      setDirty(false);
      toast.success("Збережено");
    } catch (e) {
      toast.error("Помилка збереження");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Оптимістично й локально (без loadData) — щоб анімація статусу була плавною,
  // без блимання скелетона.
  const setStatus = async (next: PaymentStatus) => {
    if (!workDay) return;
    const paid = next === "paid" ? currentAmount : next === "unpaid" ? 0 : dayPaidAmount || 0;
    setWorkDay({ ...workDay, payment_status: next, paymentStatus: next, day_paid_amount: paid });
    setDayPaidAmount(paid);
    if (next !== "partial") setPartialAmount("");
    try {
      await api.updateWorkDay(
        workDay.id,
        next === "paid"
          ? { payment_status: "paid" }
          : next === "unpaid"
            ? { payment_status: "unpaid", day_paid_amount: 0 }
            : { payment_status: "partial", day_paid_amount: paid },
      );
    } catch (e) {
      toast.error("Не вдалося оновити статус");
      console.error(e);
    }
  };

  const applyPartial = async () => {
    if (!workDay) return;
    const add = parseFloat(partialAmount.replace(",", "."));
    if (!add || add <= 0) return;
    const total = dayPaidAmount + add;
    if (total > currentAmount + 0.01) {
      toast.error("Сума перевищує вартість");
      return;
    }
    const nextStatus: PaymentStatus = total >= currentAmount ? "paid" : "partial";
    setDayPaidAmount(total);
    setWorkDay({ ...workDay, payment_status: nextStatus, paymentStatus: nextStatus, day_paid_amount: total });
    setPartialAmount("");
    try {
      await api.updateWorkDay(workDay.id, { payment_status: nextStatus, day_paid_amount: total });
      toast.success("Оплату додано");
    } catch (e) {
      toast.error("Помилка додавання оплати");
      console.error(e);
    }
  };

  const remove = async () => {
    if (!report) return;
    if (!confirm("Видалити цей запис?")) return;
    try {
      await api.deleteReport(report.id);
      toast.success("Запис видалено");
      navigate("/", { viewTransition: true });
    } catch (e) {
      toast.error("Помилка видалення");
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-background p-4">
        <div className="skeleton mb-3 h-10 w-40 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>
      </div>
    );
  }
  if (!report || !workDay || !client) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-muted-foreground">Дані не знайдено</p>
      </div>
    );
  }

  const assignments = workDay.assignments && workDay.assignments.length > 0
    ? workDay.assignments.map((a) => ({
        id: a.id,
        name: a.worker?.name || a.deleted_worker_name || "Працівниця",
        color: a.worker?.color || "#94a3b8",
        hours: a.hours || 0,
        amount: Math.round(a.amount || 0),
      }))
    : [{ id: "solo", name: client.name, color: "hsl(var(--primary))", hours: currentHours, amount: currentAmount }];

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="mx-auto flex max-w-md items-center gap-3 px-4 pt-3">
        <button
          type="button"
          aria-label="Назад"
          onClick={() => navigate("/", { viewTransition: true })}
          className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
        >
          <ArrowLeft size={20} strokeWidth={2.3} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="ibadge tint-indigo h-10 w-10 font-display text-base font-semibold">
            {client.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight text-foreground">{client.name}</h1>
            <p className="text-xs text-muted-foreground">{rate} €/год</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pb-32 pt-4">
        {/* Hero tiles: Години (tap → picker) + Сума */}
        <div className="grid grid-cols-2 gap-3">
          <label className="press tint-violet relative block rounded-2xl p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="ibadge h-8 w-8 bg-white/70"><Clock size={16} strokeWidth={2.4} /></span>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider opacity-90">Години</span>
            </div>
            <div className="num-display text-[1.7rem] leading-none text-foreground">{decimalToHours(currentHours)}</div>
            <input
              type="time"
              aria-label="Години"
              value={`${String(Math.floor(currentHours)).padStart(2, "0")}:${String(
                Math.round((currentHours - Math.floor(currentHours)) * 60),
              ).padStart(2, "0")}`}
              onChange={(e) => { setEditHours(e.target.value); setDirty(true); }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          <div className="tint-indigo rounded-2xl p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="ibadge h-8 w-8 bg-white/70"><Wallet size={16} strokeWidth={2.4} /></span>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider opacity-90">Сума</span>
            </div>
            <div className="num-display text-[1.7rem] leading-none text-foreground"><NumberFlow value={currentAmount} />€</div>
          </div>
        </div>

        {/* Оплата */}
        <section className="card-flat rounded-2xl p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Оплата</p>
          <div className="grid grid-cols-3 gap-2">
            {STATUS.map((s) => {
              const active = status === s.key;
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStatus(s.key)}
                  className="press relative flex flex-col items-center gap-1.5 rounded-xl bg-muted py-3 text-xs font-bold"
                >
                  {active && (
                    <motion.span
                      layoutId="statusHL"
                      transition={{ type: "spring", stiffness: 430, damping: 34 }}
                      className={`absolute inset-0 rounded-xl ${s.tint} ring-2 ${s.ring}`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex flex-col items-center gap-1.5 ${
                      active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <motion.span
                      key={active ? "on" : "off"}
                      initial={active ? { scale: 0.6, rotate: -12, opacity: 0 } : false}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 24 }}
                    >
                      <Icon size={20} strokeWidth={2.3} />
                    </motion.span>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {status === "partial" && (
            <div className="mt-3 space-y-2.5">
              <div className="flex gap-2">
                <input
                  inputMode="decimal"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyPartial()}
                  placeholder="Додати суму, €"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={applyPartial}
                  className="press rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
                >
                  Додати
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="tint-emerald rounded-xl px-3 py-2.5">
                  <p className="text-[0.7rem] font-semibold uppercase opacity-80">Оплачено</p>
                  <p className="num-display text-base text-foreground"><NumberFlow value={Math.round(dayPaidAmount)} />€</p>
                </div>
                <div className="tint-rose rounded-xl px-3 py-2.5">
                  <p className="text-[0.7rem] font-semibold uppercase opacity-80">Залишок</p>
                  <p className="num-display text-base text-foreground"><NumberFlow value={Math.max(0, currentAmount - Math.round(dayPaidAmount))} />€</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Дашборд працівниць: хто скільки заробив */}
        <section className="card-flat rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users size={16} strokeWidth={2.3} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Хто скільки заробив</p>
          </div>
          <div className="space-y-1">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
                <span className="h-8 w-1.5 rounded-full" style={{ background: a.color }} />
                <span className="flex-1 truncate text-sm font-semibold text-foreground">{a.name}</span>
                <span className="tabular text-sm text-muted-foreground">{decimalToHours(a.hours)} год</span>
                <span className="num-display w-16 text-right text-sm text-foreground">{a.amount}€</span>
              </div>
            ))}
          </div>
        </section>

        {/* Дата — нативний iOS date-picker */}
        <section className="space-y-1.5">
          <label className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
            <CalendarDays size={15} strokeWidth={2.3} className="text-muted-foreground" /> Дата
          </label>
          <input
            type="date"
            value={editDate}
            onChange={(e) => {
              setEditDate(e.target.value);
              setDirty(true);
            }}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base font-medium text-foreground outline-none focus:border-primary"
          />
        </section>

        {/* Нотатка */}
        <section className="space-y-1.5">
          <label className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
            <StickyNote size={15} strokeWidth={2.3} className="text-muted-foreground" /> Нотатка
          </label>
          <textarea
            value={editNote}
            onChange={(e) => {
              setEditNote(e.target.value);
              setDirty(true);
            }}
            placeholder="Що робили, деталі…"
            className="min-h-24 w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </section>

        <button
          type="button"
          onClick={remove}
          className="press flex w-full items-center justify-center gap-1.5 py-2 text-sm font-semibold text-destructive"
        >
          <Trash2 size={16} strokeWidth={2.3} /> Видалити запис
        </button>
      </main>

      {/* Sticky Save */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background to-transparent pt-6">
        <div className="mx-auto max-w-md px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground disabled:opacity-60"
          >
            <Check size={20} strokeWidth={2.6} />
            {dirty ? "Зберегти зміни" : "Збережено"}
          </button>
        </div>
      </div>

    </div>
  );
}
