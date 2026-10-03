import { useMemo, useState, useRef, useEffect } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { Clock, Wallet, Trash2, ArrowLeft, Check, CircleCheck, CircleDashed, Circle, Users, StickyNote, CalendarDays } from 'lucide-react';
import { MoneyNumber } from '@/ui/MoneyNumber';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useAddPayment, useClients, useDeleteWorkDay, useSetPayment, useUpdateWorkDayFields, useWorkDays } from '@/data/queries';
import { calculateAmount, parseNumber, applyPartialPayment } from '@/domain/money';
import { decimalToHours, hoursToDecimal } from '@/domain/time';
import type { WorkDay, PaymentStatus } from '@/domain/types';
import { ScreenSkeleton } from '@/ui/Skeleton';
import { QueryError, StaleDataNotice } from '@/ui/QueryError';
import { useAutosaveDraft } from '@/ui/useAutosaveDraft';
import { ConfirmSheet } from '@/ui/ConfirmSheet';
import { TimePickerWheel } from '@/components/TimePickerWheel';
const STATUS = [
  { key: "paid", label: "status.paid", icon: CircleCheck, tint: "tint-emerald", ring: "ring-[hsl(var(--t-emerald-fg))]" },
  { key: "partial", label: "status.partial", icon: CircleDashed, tint: "tint-amber", ring: "ring-[hsl(var(--t-amber-fg))]" },
  { key: "unpaid", label: "status.unpaid", icon: Circle, tint: "tint-rose", ring: "ring-[hsl(var(--t-rose-fg))]" },
] as const;

const WorkDayDetails = () => {
  const { dayId } = useParams();
  const query = useWorkDays();
  const day = query.data?.find(d => d.id === dayId);
  if (query.isLoading) return <ScreenSkeleton />;
  if (query.isError && !query.data) return <QueryError onRetry={() => void query.refetch()} />;
  if (!day) return <QueryError message="Запис не знайдено" onRetry={() => void query.refetch()} />;
  if (day.isPlanned) return <Navigate to={`/create-report?clientId=${day.clientId}&workDayId=${day.id}`} replace />;
  return <Details key={day.id} workDay={day} stale={query.isError} refresh={() => void query.refetch()} />;
};
const Details = ({ workDay, stale, refresh }: { workDay: WorkDay; stale: boolean; refresh: () => void }) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: clients = [] } = useClients();
  const clientRate = clients.find(client => client.id === workDay.clientId)?.hourlyRate ?? 0;
  const updateFields = useUpdateWorkDayFields();
  const setPayment = useSetPayment();
  const addPayment = useAddPayment();
  const deleteDay = useDeleteWorkDay();
  // The record's historical rate survives a later change to the client price.
  const hourlyRate = useMemo(() => workDay.hourlyRate ?? (workDay.hours > 0 ? workDay.amount / workDay.hours : clientRate), [workDay.hourlyRate, workDay.amount, workDay.hours, clientRate]);
  const serverDraft = useMemo(() => ({ date: workDay.date, hours: workDay.hours, amount: workDay.amount, note: workDay.note ?? '' }), [workDay]);
  const baseline = useRef(serverDraft);
  const autosave = useAutosaveDraft(`aria-draft:${user?.id ?? 'demo'}:${workDay.id}`, serverDraft, async draft => {
    const old = baseline.current;
    const patch = {
      ...(draft.date !== old.date ? { date: draft.date } : {}),
      ...(draft.note !== old.note ? { note: draft.note || null } : {}),
      ...(draft.hours !== old.hours || draft.amount !== old.amount ? { hours: draft.hours, amount: draft.amount } : {}),
    };
    if (Object.keys(patch).length) await updateFields.mutateAsync({ dayId: workDay.id, patch });
    baseline.current = draft;
  });
  const rebase = autosave.rebase;
  useEffect(() => {
    if (!autosave.dirty && !autosave.saving) { baseline.current = serverDraft; rebase(serverDraft); }
  }, [serverDraft, rebase, autosave.dirty, autosave.saving]);
  const { date: editDate, note: editNote, hours: currentHours, amount: currentAmount } = autosave.draft;
  const editHours = decimalToHours(currentHours);
  const setEditDate = (date: string) => autosave.update({ ...autosave.draft, date });
  const setEditNote = (note: string) => autosave.update({ ...autosave.draft, note });
  const [partialAmount, setPartialAmount] = useState('');
  const [showPartial, setShowPartial] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const busy = useRef(false);
  const paymentOperation = useRef<{ amount: number; id: string } | null>(null);
  const isPending = setPayment.isPending || addPayment.isPending || deleteDay.isPending;
  const status = workDay.status;
  const perform = async (operation: () => Promise<unknown>) => {
    if (busy.current || isPending) return;
    busy.current = true;
    try { await autosave.saveNow(); await operation(); } catch { /* The mutation shows the actionable error. */ }
    finally { busy.current = false; }
  };
  const handleSetStatus = (next: PaymentStatus) => {
    if (next === 'partial') { setShowPartial(true); return; }
    void perform(async () => {
      await setPayment.mutateAsync({ dayId: workDay.id, status: next, paidAmount: next === 'paid' ? currentAmount : 0 });
      setShowPartial(false); setPartialAmount('');
    });
  };
  const handleApplyPartial = () => {
    const amount = parseNumber(partialAmount);
    const result = applyPartialPayment({ amount: currentAmount, paidAmount: workDay.paidAmount }, amount);
    if (!result.ok) { toast.error(result.error === 'exceeds' ? 'Сума перевищує залишок' : 'Введіть коректну суму'); return; }
    if (paymentOperation.current?.amount !== amount) paymentOperation.current = { amount, id: crypto.randomUUID() };
    void perform(async () => {
      await addPayment.mutateAsync({ dayId: workDay.id, amount, operationId: paymentOperation.current!.id });
      paymentOperation.current = null; setPartialAmount(''); setShowPartial(false); toast.success('Оплату додано');
    });
  };
  const handleDelete = () => {
    void perform(async () => { await deleteDay.mutateAsync(workDay.id); autosave.discard(); navigate('/'); });
  };

  const rate = hourlyRate;
  const client = { name: workDay.clientName };
  const dayPaidAmount = workDay.paidAmount;
  const saving = isPending || autosave.saving;
  const dirty = autosave.dirty;
  const setStatus = handleSetStatus;
  const applyPartial = handleApplyPartial;
  const remove = () => setIsDeleteDialogOpen(true);
  const save = () => { void autosave.saveNow().then(() => toast.success(t('toast.saved'))).catch(() => {}); };
  const assignments = workDay.assignments.map(a => ({ id: a.id, name: a.workerName, color: a.workerColor, hours: a.hours, amount: a.amount }));
  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="mx-auto flex max-w-md items-center gap-3 px-4 pt-3">
        <button
          type="button"
          aria-label={t("common.back")}
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
            <p className="text-xs text-muted-foreground">{rate} {t("common.perHour")}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-4">
        {stale && <StaleDataNotice onRetry={refresh} />}
        {autosave.error && <div role="alert" className="card-flat p-3 text-sm text-destructive">
          <p>Зміни не збережено. Введені дані залишилися у формі.</p>
          <button className="underline font-bold" onClick={save}>Зберегти ще раз</button>
          {autosave.blocker.state === 'blocked' && <button className="ml-3 underline" onClick={() => autosave.blocker.reset?.()}>Залишитися</button>}
        </div>}
        <fieldset disabled={saving} className="space-y-4">
        {/* Hero tiles: Години (tap → picker) + Сума */}
        <div className="grid grid-cols-2 gap-3">
          <TimePickerWheel value={editHours} hourlyRate={rate} exactHours={currentHours} currentAmount={currentAmount}
            triggerClassName="press tint-violet relative block rounded-2xl p-4 text-left"
            onChange={(value, exact) => {
              const hours = exact?.hours ?? hoursToDecimal(value);
              autosave.update({ ...autosave.draft, hours, amount: exact?.amount ?? calculateAmount(hours, rate) });
            }}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className="ibadge h-8 w-8 bg-white/70"><Clock size={16} strokeWidth={2.4} /></span>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider opacity-90">{t('common.hours')}</span>
            </div>
            <div className="num-display text-[1.7rem] leading-none text-foreground">{decimalToHours(currentHours)}</div>
          </TimePickerWheel>
          <div className="tint-indigo rounded-2xl p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="ibadge h-8 w-8 bg-white/70"><Wallet size={16} strokeWidth={2.4} /></span>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider opacity-90">{t("common.amount")}</span>
            </div>
            <div className="num-display text-[1.7rem] leading-none text-foreground"><MoneyNumber value={currentAmount} />€</div>
          </div>
        </div>

        {/* Оплата */}
        <section className="card-flat rounded-2xl p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">{t("day.payment")}</p>
          <div className="grid grid-cols-3 gap-2">
            {STATUS.map((s) => {
              const active = status === s.key;
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  disabled={saving} onClick={() => setStatus(s.key)}
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
                    {t(s.label)}
                  </span>
                </button>
              );
            })}
          </div>

          {(showPartial || status === "partial") && (
            <div className="mt-3 space-y-2.5">
              <div className="flex gap-2">
                <input
                  inputMode="decimal"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyPartial()}
                  aria-label={t("common.received")} placeholder={t("common.received")}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  disabled={saving || !partialAmount} onClick={applyPartial}
                  className="press rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
                >
                  Додати
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="tint-emerald rounded-xl px-3 py-2.5">
                  <p className="text-[0.7rem] font-semibold uppercase opacity-80">{t("common.paid")}</p>
                  <p className="num-display text-base text-foreground"><MoneyNumber value={dayPaidAmount} />€</p>
                </div>
                <div className="tint-rose rounded-xl px-3 py-2.5">
                  <p className="text-[0.7rem] font-semibold uppercase opacity-80">{t("common.due")}</p>
                  <p className="num-display text-base text-foreground"><MoneyNumber value={Math.max(0, currentAmount - dayPaidAmount)} />€</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Дашборд працівниць: хто скільки заробив */}
        <section className="card-flat rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users size={16} strokeWidth={2.3} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">{t("day.whoEarned")}</p>
          </div>
          <div className="space-y-1">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
                <span className="h-8 w-1.5 rounded-full" style={{ background: a.color }} />
                <span className="flex-1 truncate text-sm font-semibold text-foreground">{a.name}</span>
                <span className="tabular text-sm text-muted-foreground">{decimalToHours(a.hours)} {t("common.hoursShort")}</span>
                <span className="num-display w-16 text-right text-sm text-foreground">{a.amount}€</span>
              </div>
            ))}
          </div>
        </section>

        {/* Дата — нативний iOS date-picker */}
        <section className="space-y-1.5">
          <label className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
            <CalendarDays size={15} strokeWidth={2.3} className="text-muted-foreground" /> {t("common.date")}
          </label>
          <input
            type="date"
            aria-label={t("common.date")}
            value={editDate}
            onChange={(e) => {
              setEditDate(e.target.value);
            }}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base font-medium text-foreground outline-none focus:border-primary"
          />
        </section>

        {/* Нотатка */}
        <section className="space-y-1.5">
          <label className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
            <StickyNote size={15} strokeWidth={2.3} className="text-muted-foreground" /> {t("common.note")}
          </label>
          <textarea aria-label={t("common.note")}
            value={editNote}
            onChange={(e) => {
              setEditNote(e.target.value);
            }}
            placeholder={t("create.whatDidYouDo")}
            className="min-h-24 w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </section>

        <button
          type="button"
          disabled={saving} onClick={remove}
          className="press flex w-full scroll-mb-32 items-center justify-center gap-1.5 py-2 text-sm font-semibold text-destructive"
        >
          <Trash2 size={16} strokeWidth={2.3} /> {t("day.deleteRecord")}
        </button>
        </fieldset>
      </main>

      {/* Sticky Save */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background to-transparent pt-6">
        <div className="mx-auto max-w-md px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="press pointer-events-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground disabled:opacity-60"
          >
            <Check size={20} strokeWidth={2.6} />
            {autosave.error ? t("common.saveChanges") : saving ? t("common.saving") : dirty ? t("common.saveChanges") : t("common.saved")}
          </button>
        </div>
      </div>

      <ConfirmSheet open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}
        title={t('day.deleteRecord') + '?'} description="Буде видалено лише цей день. Інші записи залишаться."
        onConfirm={handleDelete} confirmDisabled={saving} />
    </div>
  );
};
export default WorkDayDetails;
