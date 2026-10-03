import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, ArrowLeft, Users, Trash2, CalendarClock, CircleCheck, CircleDashed, Circle, Save, Wallet } from 'lucide-react';
import { MoneyNumber } from '@/ui/MoneyNumber';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { TimePickerWheel } from '@/components/TimePickerWheel';
import { WorkerAssignmentDialog } from '@/components/WorkerAssignmentDialog';
import { useFormGuard } from '@/ui/useFormGuard';
import { ConfirmSheet } from '@/ui/ConfirmSheet';
import { ScreenSkeleton } from '@/ui/Skeleton';
import { QueryError } from '@/ui/QueryError';
import { useClients, useWorkers, useWorkDays, useCreateWorkEntry, useSaveWorkEntry, useUpdateWorkDayFields, useDeleteWorkDay } from '@/data/queries';
import { isISODate, todayLocal } from '@/domain/dates';
import { decimalToHours } from '@/domain/time';
import { allocateUnits, calculateAmount, formatMoney, parseNumber, round2, validateSplit } from '@/domain/money';
import type { NewAssignment, NewWorkEntry, PaymentStatus } from '@/domain/types';
const STATUS = [
  { key: "paid", label: "status.paid", icon: CircleCheck, tint: "tint-emerald", ring: "ring-[hsl(var(--t-emerald-fg))]" },
  { key: "partial", label: "status.partial", icon: CircleDashed, tint: "tint-amber", ring: "ring-[hsl(var(--t-amber-fg))]" },
  { key: "unpaid", label: "status.unpaid", icon: Circle, tint: "tint-rose", ring: "ring-[hsl(var(--t-rose-fg))]" },
] as const;

const CreateReport = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get("clientId");
  const presetDate = searchParams.get("date");
  const clientsQuery = useClients();
  const { data: clients = [] } = clientsQuery;
  const workersQuery = useWorkers();
  const { data: workers = [] } = workersQuery;
  const daysQuery = useWorkDays();
  const { data: workDays = [] } = daysQuery;
  const createEntry = useCreateWorkEntry();
  const updateFields = useUpdateWorkDayFields();
  const saveEntry = useSaveWorkEntry();
  const deleteDay = useDeleteWorkDay();
  const submitting = useRef(false);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const completingPlan = useRef<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState(() => clientIdFromUrl ?? "");
  const [reportDate, setReportDate] = useState(() => (presetDate && isISODate(presetDate) ? presetDate : todayLocal()));
  const initialDate = useRef(reportDate);
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
  const editingDay = useMemo(
    () => (editingWorkDayId ? workDays.find((d) => d.id === editingWorkDayId) : undefined),
    [workDays, editingWorkDayId],
  );

  useEffect(() => {
    setSelectedClientId(clientIdFromUrl ?? "");
    setReportDate((presetDate && isISODate(presetDate) ? presetDate : todayLocal()));
    initialDate.current = presetDate && isISODate(presetDate) ? presetDate : todayLocal();
    setHours(0); setMinutes(0); setWorkNote(''); setPartialAmount(''); setWorkPaymentStatus('unpaid');
    setSelectedWorkers([]); setWorkerAmounts({}); setAmountManuallyEntered(false); request.current = null;
    hydratedDay.current = null; rateForClient.current = null; completingPlan.current = null;
  }, [clientIdFromUrl, presetDate, editingWorkDayId]);

  const hydratedDay = useRef<string | null>(null);
  useEffect(() => {
    if (editingDay && hydratedDay.current !== editingDay.id) {
      hydratedDay.current = editingDay.id;
      setSelectedClientId(editingDay.clientId);
      setWorkNote(editingDay.note ?? "");
      setReportDate(editingDay.date);
      initialDate.current = editingDay.date;
    }
  }, [editingDay, clientIdFromUrl, presetDate]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const rateForClient = useRef<string | null>(null);
  useEffect(() => {
    const target = `${selectedClient?.id}:${editingDay?.id ?? ''}`;
    if (selectedClient && (!editingWorkDayId || editingDay) && rateForClient.current !== target) {
      rateForClient.current = target;
      setCustomHourlyRate((editingDay?.hourlyRate ?? selectedClient.hourlyRate).toString());
    }
  }, [selectedClient, editingDay, editingWorkDayId, clientIdFromUrl, presetDate]);
  const getRate = useCallback(
    () => round2(customHourlyRate ? parseNumber(customHourlyRate) : selectedClient?.hourlyRate ?? 0),
    [customHourlyRate, selectedClient],
  );

  const calculateEarnings = useCallback(() => {
    if (!selectedClientId) return 0;
    return amountManuallyEntered ? round2(parseNumber(amountInput)) : calculateAmount(hours + minutes / 60, getRate());
  }, [selectedClientId, hours, minutes, getRate, amountManuallyEntered, amountInput]);

  const buildAssignments = (totalAmount: number, totalHours: number): NewAssignment[] => {
    if (selectedWorkers.length > 0) {
      const amounts = selectedWorkers.map(id => parseNumber(workerAmounts[id] ?? ""));
      const minutes = allocateUnits(Math.round(totalHours * 60), amounts);
      return selectedWorkers.map((workerId, i) => ({ workerId, amount: amounts[i], hours: minutes[i] / 60 }));
    }
    const primary = workers.find(w => w.isPrimary) ?? workers[0];
    return primary ? [{ workerId: primary.id, amount: totalAmount, hours: totalHours }] : [];
  };

  const handleDelete = () => {
    if (!editingWorkDayId || isPending) return;
    deleteDay.mutate(editingWorkDayId, { onSuccess: () => { guard.allowExit(); navigate("/"); } });
  };
  const handleSaveNote = () => {
    if (!editingWorkDayId || isPending) return;
    updateFields.mutate({ dayId: editingWorkDayId, patch: { date: reportDate, note: workNote || null } },
      { onSuccess: () => toast.success("Нотатку збережено") });
  };
  const resolveFinalHours = () => amountManuallyEntered ? parseNumber(amountInput) / getRate() : hours + minutes / 60;

  const submit = (planned: boolean) => {
    if (submitting.current || isPending || !selectedClient) return;
    const totalHours = planned ? 0 : resolveFinalHours();
    const amount = planned ? 0 : calculateEarnings();
    const paidAmount = planned || workPaymentStatus === "unpaid" ? 0 :
      workPaymentStatus === "paid" ? amount : parseNumber(partialAmount);
    if (!isISODate(reportDate)) { toast.error("Оберіть коректну дату"); return; }
    if (!planned && (!Number.isFinite(totalHours) || totalHours <= 0 || totalHours > 100.999999 || !Number.isFinite(amount) || amount <= 0 || getRate() <= 0)) {
      toast.error("Введіть коректні години, ставку та суму"); return;
    }
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > amount || (!planned && workPaymentStatus === "partial" && paidAmount <= 0)) {
      toast.error("Оплата має бути більшою за нуль і не перевищувати суму запису"); return;
    }
    if (selectedWorkers.some(id => !workers.some(w => w.id === id))) { toast.error("Оновіть список працівниць"); return; }
    const assignments = planned ? [] : buildAssignments(amount, totalHours);
    const split = validateSplit(amount, assignments);
    if (!split.valid) { toast.error(`Перевірте частки працівниць. Залишок: ${formatMoney(split.remainder)}€`); return; }
    const entry: NewWorkEntry = { clientId: selectedClient.id, clientName: selectedClient.name, date: reportDate,
      hours: totalHours, amount, hourlyRate: getRate() > 0 ? getRate() : undefined, status: planned ? "unpaid" : workPaymentStatus, paidAmount: round2(paidAmount),
      isPlanned: planned, note: workNote || undefined, assignments };
    const payload = JSON.stringify({ ...entry, clientName: undefined });
    if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
    entry.requestId = request.current!.id;
    submitting.current = true;
    const options = {
      onSuccess: () => { guard.allowExit(); toast.success(planned ? "Роботу заплановано" : editingWorkDayId ? "Запис оновлено" : "Запис створено"); navigate("/"); },
      onSettled: () => { submitting.current = false; },
    };
    if (editingWorkDayId) {
      completingPlan.current = editingWorkDayId;
      saveEntry.mutate({ dayId: editingWorkDayId, entry }, options);
    }
    else createEntry.mutate(entry, options);
  };
  const handlePlanWork = () => submit(true);
  const handleCreateOrSave = () => submit(false);

  // Сума ← час
  useEffect(() => {
    const rate = getRate();
    if (rate > 0 && !isAmountFocused && !amountManuallyEntered) {
      setAmountInput(calculateAmount(hours + minutes / 60, rate).toString());
    }
  }, [hours, minutes, getRate, isAmountFocused, amountManuallyEntered]);

  const handleAmountChange = (newAmount: string) => {
    setAmountInput(newAmount);
    setAmountManuallyEntered(true);
    if (newAmount && !isNaN(parseNumber(newAmount))) {
      const rate = getRate();
      if (rate > 0) {
        const totalHours = parseNumber(newAmount) / rate;
        const h = Math.floor(totalHours);
        setHours(h);
        setMinutes((totalHours - h) * 60);
      }
    }
  };

  const isPending = !!(createEntry.isPending || saveEntry.isPending || updateFields.isPending || deleteDay.isPending);
  const dirty = amountManuallyEntered || hours > 0 || minutes > 0 || workNote !== (editingDay?.note ?? '') ||
    reportDate !== (editingDay?.date ?? initialDate.current) || workPaymentStatus !== 'unpaid' || selectedWorkers.length > 0 ||
    !!customHourlyRate && parseNumber(customHourlyRate) !== (editingDay?.hourlyRate ?? selectedClient?.hourlyRate);
  const guard = useFormGuard(dirty, isPending);

  if (clientsQuery.isLoading || (editingWorkDayId && daysQuery.isLoading) || workersQuery.isLoading) return <ScreenSkeleton />;
  if (clientsQuery.isError || workersQuery.isError || (editingWorkDayId && daysQuery.isError)) return <QueryError onRetry={() => { void clientsQuery.refetch(); void workersQuery.refetch(); void daysQuery.refetch(); }} />;
  if (editingDay && !editingDay.isPlanned && completingPlan.current !== editingDay.id) return <Navigate to={`/day/${editingDay.id}`} replace />;
  if (!selectedClient || (editingWorkDayId && !editingDay)) return <QueryError message="Клієнта або запис не знайдено" onRetry={() => navigate("/select-client")} />;

  const rate = getRate();
  const timeStr = decimalToHours(resolveFinalHours()) || '0:00';
  const hasTime = Number.isFinite(resolveFinalHours()) && resolveFinalHours() > 0;
  const handleWorkersChange = (ids: string[], amounts: Record<string,string>) => { setSelectedWorkers(ids); setWorkerAmounts(amounts); };
  const isWorkerAssignmentValid = () => validateSplit(calculateEarnings(), buildAssignments(calculateEarnings(), resolveFinalHours())).valid;
  const handleDeletePlannedWork = () => setIsDeleteDialogOpen(true);
  const handleCreateReport = handleCreateOrSave;
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-md items-center gap-3 px-4 pt-3">
        <button type="button" aria-label={t("common.back")} onClick={() => navigate(-1)} className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
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
            <h1 className="truncate text-lg font-bold text-foreground">{selectedClient?.name || t("create.newRecord")}</h1>
            <p className="text-xs text-muted-foreground">{editingWorkDayId ? t("day.editing") : t("day.newRecord")}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-4">
        <fieldset disabled={isPending} className="space-y-4">
        {/* Дата */}
        <section className="space-y-1.5">
          <label className="flex items-center gap-1.5 px-1 text-sm font-semibold text-foreground">
            <CalendarClock size={15} strokeWidth={2.3} className="text-muted-foreground" /> {t("common.date")}
          </label>
          <input type="date" aria-label="Дата запису" value={reportDate} onChange={(e) => setReportDate(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-base font-medium text-foreground outline-none focus:border-primary" />
        </section>

        {/* Години + Сума */}
        <div className="grid grid-cols-2 gap-3">
          <TimePickerWheel value={timeStr} hourlyRate={rate} exactHours={resolveFinalHours()} currentAmount={calculateEarnings()}
            triggerClassName="press tint-violet relative block rounded-2xl p-4 text-left"
            onChange={(value, exact) => {
              const duration = exact?.hours ?? 0;
              setHours(Math.floor(duration)); setMinutes((duration % 1) * 60);
              setAmountManuallyEntered(exact?.manual ?? false);
              if (exact?.manual) setAmountInput(String(exact.amount));
            }}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className="ibadge h-8 w-8 bg-white/70"><Clock size={16} strokeWidth={2.4} /></span>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider opacity-90">{t('common.hours')}</span>
            </div>
            <div className="num-display text-[1.7rem] leading-none text-foreground">{timeStr}</div>
          </TimePickerWheel>
          <div className="tint-indigo rounded-2xl p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="ibadge h-8 w-8 bg-white/70"><Wallet size={16} strokeWidth={2.4} /></span>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider opacity-90">{t("common.amount")}</span>
            </div>
            <input
              inputMode="decimal"
              aria-label="Сума запису" value={amountInput}
              onFocus={(event) => { setIsAmountFocused(true); event.target.select(); }}
              onBlur={() => setIsAmountFocused(false)}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0"
              className="num-display w-full bg-transparent text-[1.7rem] leading-none text-foreground outline-none"
            />
          </div>
        </div>

        {/* Ставка */}
        <section className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <span className="text-sm font-semibold text-foreground">{t("common.rate.hour")}</span>
          <div className="flex items-center gap-1">
            <input inputMode="decimal" aria-label="Ставка за годину" value={customHourlyRate} onChange={(e) => setCustomHourlyRate(e.target.value)} placeholder="0"
              className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm font-semibold outline-none focus:border-primary" />
            <span className="text-sm text-muted-foreground">{t("common.perHour")}</span>
          </div>
        </section>

        {/* Працівниці */}
        {hasTime && selectedClientId && workers.length > 0 && (
          <button type="button" onClick={() => setWorkerDialogOpen(true)}
            className="press flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users size={17} strokeWidth={2.3} className="text-primary" />
              {selectedWorkers.length > 0 ? t("create.splitMany", { n: selectedWorkers.length }) : t("create.splitOne")}
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
        />

        {/* Оплата */}
        {hasTime && selectedClientId && (
          <section className="card-flat rounded-2xl p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{t("day.payment")}</p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS.map((s) => {
                const active = workPaymentStatus === s.key;
                const Icon = s.icon;
                return (
                  <button key={s.key} type="button" onClick={() => setWorkPaymentStatus(s.key)}
                    className="press relative flex flex-col items-center gap-1.5 rounded-xl bg-muted py-3 text-xs font-bold">
                    {active && <motion.span layoutId="createStatusHL" transition={{ type: "spring", stiffness: 430, damping: 34 }} className={`absolute inset-0 rounded-xl ${s.tint} ring-2 ${s.ring}`} />}
                    <span className={`relative z-10 flex flex-col items-center gap-1.5 ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      <Icon size={20} strokeWidth={2.3} /> {t(s.label)}
                    </span>
                  </button>
                );
              })}
            </div>
            {workPaymentStatus === "partial" && (
              <div className="relative mt-3">
                <input inputMode="decimal" aria-label={t("common.received")} value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)} placeholder={t("common.received")}
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
              <label className="text-sm font-semibold text-foreground">{t("common.note")}</label>
              {editingWorkDayId && (
                <button onClick={handleSaveNote} className="press flex items-center gap-1 text-xs font-semibold text-primary">
                  <Save size={13} /> {t("common.save")}
                </button>
              )}
            </div>
            <textarea aria-label={t("common.note")} value={workNote} onChange={(e) => setWorkNote(e.target.value)} placeholder={t("create.whatDidYouDo")}
              className="min-h-20 w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
          </section>
        )}
        </fieldset>
      </main>

      {/* Sticky action */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background to-transparent pt-6">
        <div className="mx-auto flex max-w-md gap-2 px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] [&>button]:pointer-events-auto">
          {!hasTime && (!amountInput || amountInput === "0") ? (
            editingWorkDayId ? (
              <button disabled={isPending} onClick={handleDeletePlannedWork} className="press flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-base font-bold text-destructive">
                <Trash2 size={18} /> {t("day.deleteRecord")}
              </button>
            ) : (
              <button onClick={handlePlanWork} disabled={isPending || !selectedClientId}
                className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/60 py-4 text-base font-bold text-[hsl(var(--t-amber-fg))] disabled:opacity-50">
                <CalendarClock size={18} /> {t("create.planWork")}
              </button>
            )
          ) : (
            <>
              {editingWorkDayId && (
                <button disabled={isPending} onClick={handleDeletePlannedWork} aria-label={t("common.delete")} className="press flex h-[3.6rem] w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-destructive">
                  <Trash2 size={20} />
                </button>
              )}
              <button
                onClick={handleCreateReport}
                aria-label={editingWorkDayId ? t("create.saveRecord") : t("create.createRecord")}
                disabled={isPending || !selectedClientId || !hasTime || (workPaymentStatus === "partial" && !partialAmount) || !isWorkerAssignmentValid()}
                className="press flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground disabled:opacity-50"
              >
                {editingWorkDayId ? t("create.saveRecord") : t("create.createRecord")} · <MoneyNumber value={calculateEarnings()} />€
              </button>
            </>
          )}
        </div>
      </div>

      <ConfirmSheet open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}
        title={t('day.deleteRecord') + '?'} description="Буде видалено лише цей день. Інші записи залишаться."
        onConfirm={handleDelete} confirmDisabled={isPending} />
      <ConfirmSheet open={guard.blocker.state === 'blocked'} onOpenChange={open => { if (!open) guard.blocker.reset?.(); }}
        title="Залишити незбережений запис?" description="Введені дані буде втрачено."
        confirmLabel="Залишити" confirmDisabled={isPending} onConfirm={() => guard.blocker.proceed?.()} />
    </div>
  );
};
export default CreateReport;
