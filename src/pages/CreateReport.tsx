import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Pencil, Clock, Users, Trash2, CalendarClock, CircleCheck, CircleDashed, Circle, Save, Wallet, BadgeEuro } from 'lucide-react';
import { MoneyNumber } from '@/ui/MoneyNumber';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { TimePickerWheel } from '@/components/TimePickerWheel';
import { WorkerAssignmentDialog } from '@/components/WorkerAssignmentDialog';
import { useFormGuard } from '@/ui/useFormGuard';
import { ConfirmSheet } from '@/ui/ConfirmSheet';
import { ScreenSkeleton } from '@/ui/Skeleton';
import { QueryError } from '@/ui/QueryError';
import { markNav, useGo } from '@/ui/nav';
import { Column, IconFrame, Screen, SectionLabel, TopBar } from '@/ui/Screen';
import { Button, IconButton } from '@/ui/Button';
import { PickerRow, TextArea, TextInput } from '@/ui/Field';
import { DateField } from '@/ui/DateField';
import { Segmented } from '@/ui/Segmented';
import { ClientAvatar } from '@/ui/Avatar';
import { reveal } from '@/ui/motion';
import { useClients, useWorkers, useWorkDays, useCreateWorkEntry, useSaveWorkEntry, useUpdateWorkDayFields, useDeleteWorkDay } from '@/data/queries';
import { isISODate, todayLocal } from '@/domain/dates';
import { decimalToHours } from '@/domain/time';
import { allocateUnits, calculateAmount, formatMoney, parseNumber, round2, toWholeEuros, validateSplit } from '@/domain/money';
import type { NewAssignment, NewWorkEntry, PaymentStatus } from '@/domain/types';

const STATUS = [
  { key: "paid", label: "status.paid", icon: CircleCheck, tone: "ok" },
  { key: "partial", label: "status.partial", icon: CircleDashed, tone: "warn" },
  { key: "unpaid", label: "status.unpaid", icon: Circle, tone: "alert" },
] as const;

/**
 * Новий запис (і завершення запланованого). Обов'язкове — лише години або сума;
 * без них головна дія стає «Запланувати роботу». Вихід з незбереженими змінами
 * питає підтвердження. Повторне натискання не створює дубль (ключ операції).
 */
const CreateReport = () => {
  const navigate = useNavigate();
  const go = useGo();
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
    return amountManuallyEntered ? toWholeEuros(parseNumber(amountInput)) : calculateAmount(hours + minutes / 60, getRate());
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
    deleteDay.mutate(editingWorkDayId, { onSuccess: () => { guard.allowExit(); go("/", "back"); } });
  };
  const handleSaveNote = () => {
    if (!editingWorkDayId || isPending) return;
    updateFields.mutate({ dayId: editingWorkDayId, patch: { date: reportDate, note: workNote || null } },
      { onSuccess: () => toast.success("Нотатку збережено") });
  };
  const resolveFinalHours = () => amountManuallyEntered ? calculateEarnings() / getRate() : hours + minutes / 60;

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
      onSuccess: () => { guard.allowExit(); toast.success(planned ? "Роботу заплановано" : editingWorkDayId ? "Запис оновлено" : "Запис створено"); go("/", "back"); },
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
        const totalHours = toWholeEuros(parseNumber(newAmount)) / rate;
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
  if (!selectedClient || (editingWorkDayId && !editingDay)) return <QueryError message="Клієнта або запис не знайдено" onRetry={() => go("/select-client", "back")} />;

  const rate = getRate();
  const timeStr = decimalToHours(resolveFinalHours()) || '0:00';
  const hasTime = Number.isFinite(resolveFinalHours()) && resolveFinalHours() > 0;
  const handleWorkersChange = (ids: string[], amounts: Record<string,string>) => { setSelectedWorkers(ids); setWorkerAmounts(amounts); };
  const isWorkerAssignmentValid = () => validateSplit(calculateEarnings(), buildAssignments(calculateEarnings(), resolveFinalHours())).valid;
  const handleDeletePlannedWork = () => setIsDeleteDialogOpen(true);
  const handleCreateReport = handleCreateOrSave;
  const marks = new Set(workDays.filter(d => d.clientId === selectedClientId && d.id !== editingWorkDayId).map(d => d.date));
  const amountValue = calculateEarnings();
  return (
    <Screen>
      <TopBar
        onBack={() => { markNav("back"); navigate(-1); }}
        backLabel={t("common.back")}
        leading={<ClientAvatar name={selectedClient.name} id={selectedClientId} transitionName={`avatar-${selectedClientId}`} />}
        title={selectedClient.name || t("create.newRecord")}
        subtitle={editingWorkDayId ? t("day.editing") : t("day.newRecord")}
      />

      <Column className="pb-[calc(8rem+env(safe-area-inset-bottom))] pt-2">
        <fieldset disabled={isPending} className="min-w-0 space-y-5">
          {/* Час і сума */}
          <div className="grid grid-cols-2 gap-3">
            <TimePickerWheel value={timeStr} hourlyRate={rate} exactHours={resolveFinalHours()} currentAmount={amountValue}
              triggerClassName="press tap card block p-4 text-left"
              onChange={(value, exact) => {
                const duration = exact?.hours ?? 0;
                setHours(Math.floor(duration)); setMinutes((duration % 1) * 60);
                setAmountManuallyEntered(exact?.manual ?? false);
                if (exact?.manual) setAmountInput(String(exact.amount));
              }}>
              <span className="mb-3 flex items-center gap-2">
                <IconFrame tone="accent" size="sm"><Clock size={15} strokeWidth={2.3} /></IconFrame>
                <span className="text-footnote font-semibold text-ink-3">{t('common.hours')}</span>
              </span>
              <span className={`num block text-display ${hasTime ? 'text-ink' : 'text-ink-4'}`}>{timeStr}</span>
              <span className="mt-1 flex items-center gap-1 text-caption font-semibold text-accent-ink"><Pencil size={11} strokeWidth={2.6} />{t("day.hoursHint")}</span>
            </TimePickerWheel>
            <label className="card block cursor-text p-4 transition-shadow focus-within:shadow-[0_0_0_2px_var(--accent),0_0_0_5px_var(--focus)]">
              <span className="mb-3 flex items-center gap-2">
                <IconFrame size="sm"><Wallet size={15} strokeWidth={2.3} /></IconFrame>
                <span className="text-footnote font-semibold text-ink-3">{t("common.amount")}</span>
              </span>
              <span className="flex items-baseline gap-1">
                <input
                  inputMode="decimal"
                  aria-label="Сума запису" value={amountInput}
                  onFocus={(event) => { setIsAmountFocused(true); event.target.select(); }}
                  onBlur={() => {
                    setIsAmountFocused(false);
                    if (amountManuallyEntered && Number.isFinite(parseNumber(amountInput))) setAmountInput(String(toWholeEuros(parseNumber(amountInput))));
                  }}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  style={{ width: `${Math.max(1, (amountInput || '0').length) + 0.3}ch` }}
                  className={`num min-w-0 max-w-full bg-transparent text-display outline-none placeholder:text-ink-4 ${!amountInput || amountInput === '0' ? 'text-ink-4' : 'text-ink'}`}
                />
                <span className="text-title font-semibold text-ink-3">€</span>
              </span>
              <span className="mt-1 block text-caption text-ink-4">{formatMoney(rate)} {t("common.perHour")}</span>
            </label>
          </div>

          {/* Деталі */}
          <div className="card list overflow-hidden [--list-inset:3.75rem]">
            <DateField value={reportDate} onChange={setReportDate} label="Дата запису" marks={marks} />
            <div className="flex min-h-14 items-center gap-3 px-4 py-2">
              <IconFrame tone="accent" size="sm"><BadgeEuro size={16} strokeWidth={2.2} /></IconFrame>
              <span className="flex-1 text-body text-ink">{t("common.rate.hour")}</span>
              <TextInput inputMode="decimal" aria-label="Ставка за годину" value={customHourlyRate} onChange={(e) => setCustomHourlyRate(e.target.value)}
                placeholder="0" suffix={t("common.perHour")} wrapClassName="h-10 w-32 px-3" className="num text-right font-semibold" />
            </div>
            {hasTime && selectedClientId && workers.length > 0 && (
              <PickerRow
                onClick={() => setWorkerDialogOpen(true)}
                icon={<IconFrame tone="accent" size="sm"><Users size={16} strokeWidth={2.2} /></IconFrame>}
                label={t("workers.title")}
                value={selectedWorkers.length > 0 ? (
                  <span className="flex items-center gap-2">
                    <span className="flex -space-x-1.5">
                      {selectedWorkers.slice(0, 3).map((id) => {
                        const w = workers.find((x) => x.id === id);
                        return w ? <span key={id} className="h-5 w-5 rounded-full ring-2 ring-surface" style={{ background: w.color }} /> : null;
                      })}
                    </span>
                    {t("create.splitMany", { n: selectedWorkers.length })}
                  </span>
                ) : t("workers.solo")}
              />
            )}
          </div>
          <WorkerAssignmentDialog
            open={workerDialogOpen}
            onOpenChange={setWorkerDialogOpen}
            workers={workers}
            selectedWorkers={selectedWorkers}
            workerAmounts={workerAmounts}
            totalAmount={amountValue}
            onWorkersChange={handleWorkersChange}
          />

          {/* Оплата */}
          {hasTime && selectedClientId && (
            <section className="space-y-2">
              <SectionLabel>{t("day.payment")}</SectionLabel>
              <div className="card p-2">
                <Segmented<PaymentStatus>
                  value={workPaymentStatus}
                  onChange={setWorkPaymentStatus}
                  stacked
                  className="bg-transparent p-0"
                  options={STATUS.map((s) => ({ value: s.key, label: t(s.label), tone: s.tone, icon: <s.icon size={20} strokeWidth={2.2} /> }))}
                />
                <AnimatePresence initial={false}>
                  {workPaymentStatus === "partial" && (
                    <motion.div {...reveal} className="overflow-hidden">
                      <div className="px-1 pb-1 pt-2">
                        <TextInput inputMode="decimal" aria-label={t("common.received")} value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)}
                          placeholder={t("common.received")} suffix="€" className="num" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Нотатка */}
          {selectedClientId && (
            <section className="space-y-2">
              <SectionLabel action={editingWorkDayId && (
                <Button variant="ghost" size="sm" className="-mr-2 h-7 text-accent-ink" icon={<Save size={14} strokeWidth={2.3} />} onClick={handleSaveNote}>{t("common.save")}</Button>
              )}>{t("common.note")}</SectionLabel>
              <TextArea aria-label={t("common.note")} value={workNote} onChange={(e) => setWorkNote(e.target.value)} placeholder={t("create.whatDidYouDo")}
                className="bg-surface shadow-card" />
            </section>
          )}
        </fieldset>
      </Column>

      {/* Головна дія — липка внизу */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="h-8 bg-gradient-to-t from-canvas to-transparent" />
        <div className="bg-canvas pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Column className="flex gap-2.5 [&>button]:pointer-events-auto">
            {!hasTime && (!amountInput || amountInput === "0") ? (
              editingWorkDayId ? (
                <Button variant="tonal" tone="alert" size="lg" block disabled={isPending} onClick={handleDeletePlannedWork} icon={<Trash2 size={18} strokeWidth={2.2} />}>
                  {t("day.deleteRecord")}
                </Button>
              ) : (
                <Button variant="tonal" size="lg" block disabled={isPending || !selectedClientId} onClick={handlePlanWork} icon={<CalendarClock size={19} strokeWidth={2.2} />}>
                  {t("create.planWork")}
                </Button>
              )
            ) : (
              <>
                {editingWorkDayId && (
                  <IconButton label={t("common.delete")} variant="tonal" tone="alert" size="lg" className="h-[3.25rem] w-[3.25rem] rounded-[16px]" disabled={isPending} onClick={handleDeletePlannedWork}>
                    <Trash2 size={20} strokeWidth={2.2} />
                  </IconButton>
                )}
                <Button
                  variant="primary" size="lg" block
                  onClick={handleCreateReport}
                  aria-label={editingWorkDayId ? t("create.saveRecord") : t("create.createRecord")}
                  disabled={isPending || !selectedClientId || !hasTime || (workPaymentStatus === "partial" && !partialAmount) || !isWorkerAssignmentValid()}
                >
                  {editingWorkDayId ? t("create.saveRecord") : t("create.createRecord")}
                  <span className="num rounded-full bg-white/18 px-2.5 py-0.5 text-callout"><MoneyNumber value={amountValue} /> €</span>
                </Button>
              </>
            )}
          </Column>
        </div>
      </div>

      <ConfirmSheet open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}
        title={t('day.deleteRecord') + '?'} description="Буде видалено лише цей день. Інші записи залишаться."
        onConfirm={handleDelete} confirmDisabled={isPending} />
      <ConfirmSheet open={guard.blocker.state === 'blocked'} onOpenChange={open => { if (!open) guard.blocker.reset?.(); }}
        title="Залишити незбережений запис?" description="Введені дані буде втрачено."
        confirmLabel="Залишити" confirmDisabled={isPending} onConfirm={() => guard.blocker.proceed?.()} />
    </Screen>
  );
};
export default CreateReport;
