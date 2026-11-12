import { useMemo, useState, useRef, useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Pencil, Clock, Wallet, Trash2, Check, CircleCheck, CircleDashed, Circle, CloudAlert } from 'lucide-react';
import { MoneyNumber } from '@/ui/MoneyNumber';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useAddPayment, useClients, useDeleteWorkDay, useSetPayment, useUpdateWorkDayFields, useWorkDays } from '@/data/queries';
import { calculateAmount, parseNumber, applyPartialPayment, paymentView, resolveStatus, assignmentViews, formatMoney, round2 } from '@/domain/money';
import { decimalToHours, hoursToDecimal } from '@/domain/time';
import type { WorkDay, PaymentStatus } from '@/domain/types';
import { ScreenSkeleton } from '@/ui/Skeleton';
import { QueryError, StaleDataNotice } from '@/ui/QueryError';
import { useAutosaveDraft } from '@/ui/useAutosaveDraft';
import { ConfirmSheet } from '@/ui/ConfirmSheet';
import { useGo } from '@/ui/nav';
import { Column, IconFrame, Screen, SectionLabel, TopBar } from '@/ui/Screen';
import { Button } from '@/ui/Button';
import { TextArea } from '@/ui/Field';
import { DateField } from '@/ui/DateField';
import { Segmented } from '@/ui/Segmented';
import { ClientAvatar } from '@/ui/Avatar';
import { PartialEntry, PaymentSummary } from '@/ui/Payment';
import { reveal } from '@/ui/motion';
import { TimePickerWheel } from '@/components/TimePickerWheel';

const STATUS = [
  { key: "paid", label: "status.paid", icon: CircleCheck, tone: "ok" },
  { key: "partial", label: "status.partial", icon: CircleDashed, tone: "warn" },
  { key: "unpaid", label: "status.unpaid", icon: Circle, tone: "alert" },
] as const;

/**
 * Сторінка дня: усе про один запис і керування ним. Зміни годин, дати й
 * нотатки зберігаються самі (автозбереження з чернеткою); оплата — одразу.
 * Кнопка внизу показує стан збереження й дозволяє зберегти негайно.
 */
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
  const go = useGo();
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
  const payment = paymentView(currentAmount, workDay.paidAmount);
  const status = resolveStatus(payment.paid, payment.amount);
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
    const entered = parseNumber(partialAmount);
    const amount = payment.due > 0 && entered === payment.due ? round2(currentAmount - workDay.paidAmount) : entered;
    const result = applyPartialPayment({ amount: currentAmount, paidAmount: workDay.paidAmount }, amount);
    if (!result.ok) { toast.error(result.error === 'exceeds' ? 'Сума перевищує залишок' : 'Введіть коректну суму'); return; }
    if (paymentOperation.current?.amount !== amount) paymentOperation.current = { amount, id: crypto.randomUUID() };
    void perform(async () => {
      await addPayment.mutateAsync({ dayId: workDay.id, amount, operationId: paymentOperation.current!.id });
      paymentOperation.current = null; setPartialAmount(''); setShowPartial(false); toast.success('Оплату додано');
    });
  };
  const handleDelete = () => {
    void perform(async () => { await deleteDay.mutateAsync(workDay.id); autosave.discard(); go('/', 'back'); });
  };

  const rate = hourlyRate;
  const client = { name: workDay.clientName };
  const dayPaidAmount = payment.paid;
  const saving = isPending || autosave.saving;
  const dirty = autosave.dirty;
  const setStatus = handleSetStatus;
  const applyPartial = handleApplyPartial;
  const remove = () => setIsDeleteDialogOpen(true);
  const save = () => { void autosave.saveNow().then(() => toast.success(t('toast.saved'))).catch(() => {}); };
  const shares = assignmentViews(workDay);
  const assignments = workDay.assignments.map((a, index) => ({ id: a.id, name: a.workerName, color: a.workerColor, hours: a.hours, amount: shares[index].amount }));
  const workers = workDay.assignments.length;
  return (
    <Screen>
      <TopBar
        onBack={() => go("/", "back")}
        backLabel={t("common.back")}
        leading={<ClientAvatar name={client.name} id={workDay.clientId} />}
        title={client.name}
        subtitle={`${formatMoney(rate)} ${t("common.perHour")}`}
      />

      <Column as="main" className="space-y-5 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-2">
        {stale && <StaleDataNotice onRetry={refresh} />}
        {autosave.error && (
          <div role="alert" className="flex items-start gap-3 rounded-[16px] bg-alert-tint p-4 text-footnote text-alert-ink">
            <CloudAlert size={18} strokeWidth={2.2} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Зміни не збережено. Введені дані залишилися у формі.</p>
              <div className="mt-2 flex gap-4">
                <button className="font-bold underline underline-offset-2" onClick={save}>Зберегти ще раз</button>
                {autosave.blocker.state === 'blocked' && <button className="underline underline-offset-2" onClick={() => autosave.blocker.reset?.()}>Залишитися</button>}
              </div>
            </div>
          </div>
        )}
        <fieldset disabled={saving} className="min-w-0 space-y-5">
          {/* Час і сума */}
          <div className="grid grid-cols-2 gap-3">
            <TimePickerWheel value={editHours} hourlyRate={rate} exactHours={currentHours} currentAmount={currentAmount}
              triggerClassName="press tap card block p-4 text-left"
              onChange={(value, exact) => {
                const hours = exact?.hours ?? hoursToDecimal(value);
                autosave.update({ ...autosave.draft, hours, amount: exact?.amount ?? calculateAmount(hours, rate) });
              }}>
              <span className="mb-3 flex items-center gap-2">
                <IconFrame tone="accent" size="sm"><Clock size={15} strokeWidth={2.3} /></IconFrame>
                <span className="text-footnote font-semibold text-ink-3">{t('common.hours')}</span>
              </span>
              <span className="num block text-display text-ink">{decimalToHours(currentHours)}</span>
              <span className="mt-1 flex items-center gap-1 text-caption font-semibold text-accent-ink"><Pencil size={11} strokeWidth={2.6} />{t("day.hoursHint")}</span>
            </TimePickerWheel>
            <div className="card p-4">
              <span className="mb-3 flex items-center gap-2">
                <IconFrame size="sm"><Wallet size={15} strokeWidth={2.3} /></IconFrame>
                <span className="text-footnote font-semibold text-ink-3">{t("common.amount")}</span>
              </span>
              <span className="num block text-display text-ink"><MoneyNumber value={currentAmount} /><span className="ml-1 text-title font-semibold text-ink-3">€</span></span>
              <span className="mt-1 block text-caption text-ink-4">{formatMoney(rate)} {t("common.perHour")}</span>
            </div>
          </div>

          <div className="card list overflow-hidden">
            <DateField value={editDate} onChange={setEditDate} label={t("common.date")} />
          </div>

          {/* Оплата */}
          <section className="space-y-2">
            <SectionLabel>{t("day.payment")}</SectionLabel>
            <div className="card p-2">
              <Segmented<PaymentStatus>
                value={status}
                onChange={setStatus}
                disabled={saving}
                stacked
                className="bg-transparent p-0"
                options={STATUS.map((s) => ({ value: s.key, label: t(s.label), tone: s.tone, icon: <s.icon size={20} strokeWidth={2.2} /> }))}
              />
              <AnimatePresence initial={false}>
                {(showPartial || status === "partial") && (
                  <motion.div {...reveal} className="overflow-hidden">
                    <div className="space-y-3 px-1 pb-1 pt-3">
                      <PaymentSummary amount={payment.amount} paid={dayPaidAmount} due={payment.due} />
                      <PartialEntry value={partialAmount} onChange={setPartialAmount} onSubmit={applyPartial} due={payment.due} pending={saving} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Хто скільки заробив */}
          {workers > 0 && (
            <section className="space-y-2">
              <SectionLabel>{t("day.whoEarned")}</SectionLabel>
              <div className="card list overflow-hidden [--list-inset:3.75rem]">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-footnote font-bold text-white" style={{ background: a.color }}>
                      {a.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-headline text-ink">{a.name}</span>
                    <span className="num text-callout text-ink-3">{decimalToHours(a.hours)} {t("common.hoursShort")}</span>
                    <span className="num w-16 text-right text-headline text-ink">{a.amount} €</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Нотатка */}
          <section className="space-y-2">
            <SectionLabel>{t("common.note")}</SectionLabel>
            <TextArea aria-label={t("common.note")} value={editNote} onChange={(e) => setEditNote(e.target.value)}
              placeholder={t("create.whatDidYouDo")} className="bg-surface shadow-card" />
          </section>

          <Button variant="ghost" tone="alert" block disabled={saving} onClick={remove} icon={<Trash2 size={17} strokeWidth={2.2} />} className="scroll-mb-32">
            {t("day.deleteRecord")}
          </Button>
        </fieldset>
      </Column>

      {/* Стан збереження */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="h-8 bg-gradient-to-t from-canvas to-transparent" />
        <div className="bg-canvas pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Column>
            <Button variant={dirty || autosave.error ? "primary" : "tonal"} size="lg" block onClick={save} disabled={saving} className="pointer-events-auto"
              icon={<Check size={19} strokeWidth={2.6} />}>
              {autosave.error ? t("common.saveChanges") : saving ? t("common.saving") : dirty ? t("common.saveChanges") : t("common.saved")}
            </Button>
          </Column>
        </div>
      </div>

      <ConfirmSheet open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}
        title={t('day.deleteRecord') + '?'} description="Буде видалено лише цей день. Інші записи залишаться."
        onConfirm={handleDelete} confirmDisabled={saving} />
    </Screen>
  );
};
export default WorkDayDetails;
