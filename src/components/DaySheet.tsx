import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  useClients,
  useDeleteReport,
  useSetPayment,
  useUpdateWorkDayFields,
  useWorkDays,
} from "@/data/queries";
import { reconcile, round2 } from "@/domain/money";
import { formatFullDate } from "@/domain/dates";
import { Sheet } from "@/ui/Sheet";
import { Button } from "@/ui/Button";
import { HoursField } from "@/ui/HoursField";
import { AmountField, type AmountMode } from "@/ui/AmountField";
import { PaymentControl } from "@/ui/PaymentControl";

/**
 * DaySheet — редагування одного дня (фікс B1/B7/B11).
 * Явне «Зберегти» (не автозбереження), reconcile при зміні суми, конверсія
 * планового через «Позначити виконаним». Видалення — інлайн-підтвердження.
 */
export function DaySheet({
  open,
  onOpenChange,
  dayId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dayId: string | null;
}) {
  const { data: days = [] } = useWorkDays();
  const { data: clients = [] } = useClients();
  const day = days.find((d) => d.id === dayId);
  const client = clients.find((c) => c.id === day?.clientId);
  const rate = client?.hourlyRate ?? 0;

  const update = useUpdateWorkDayFields();
  const setPay = useSetPayment();
  const del = useDeleteReport();

  const [date, setDate] = useState("");
  const [hours, setHours] = useState(0);
  const [mode, setMode] = useState<AmountMode>("fromHours");
  const [amountInput, setAmountInput] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [note, setNote] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const initRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      initRef.current = null;
      return;
    }
    if (day && initRef.current !== day.id) {
      initRef.current = day.id;
      setDate(day.date);
      setHours(day.hours);
      setMode(Math.abs(day.amount - round2(day.hours * rate)) < 0.01 ? "fromHours" : "fromAmount");
      setAmountInput(day.amount);
      setPaidAmount(day.paidAmount);
      setNote(day.note ?? "");
      setConfirmDel(false);
    }
  }, [open, day, rate]);

  const amount = mode === "fromHours" ? round2(hours * rate) : amountInput;
  const rec = reconcile(amount, paidAmount);
  const switchMode = (m: AmountMode) => {
    if (m === "fromAmount") setAmountInput(amount);
    setMode(m);
  };

  const save = (markDone: boolean) => {
    if (!day) return;
    update.mutate({
      dayId: day.id,
      patch: {
        date,
        hours,
        amount,
        note: note.trim() || null,
        isPlanned: markDone ? false : day.isPlanned,
      },
    });
    setPay.mutate({ dayId: day.id, status: rec.status, paidAmount: rec.paidAmount });
    toast.success(markDone ? "Позначено виконаним" : "Збережено");
    onOpenChange(false);
  };

  const remove = () => {
    if (!day) return;
    del.mutate(day.reportId);
    onOpenChange(false);
  };

  if (!day) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange} title="Запис">
        <p className="py-8 text-center text-ink-2">Дані не знайдено</p>
      </Sheet>
    );
  }

  const planned = day.isPlanned;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={day.clientName}
      description={`Запис ${formatFullDate(day.date)}`}
      footer={
        confirmDel ? (
          <div className="flex gap-2">
            <Button variant="ghost" block onClick={() => setConfirmDel(false)}>
              Скасувати
            </Button>
            <Button variant="danger" block onClick={remove}>
              Видалити назавжди
            </Button>
          </div>
        ) : planned ? (
          <Button block disabled={hours <= 0} onClick={() => save(true)}>
            Позначити виконаним
          </Button>
        ) : (
          <Button block onClick={() => save(false)}>
            Зберегти
          </Button>
        )
      }
    >
      <div className="space-y-1.5">
        <label className="caption">Дата</label>
        <input
          type="date"
          className="field"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="surface-card space-y-2 p-3">
        <label className="caption">Години</label>
        <HoursField value={hours} onChange={setHours} />
      </div>

      {hours > 0 && (
        <>
          <AmountField
            value={amount}
            onChange={setAmountInput}
            mode={mode}
            onModeChange={switchMode}
            rate={rate}
            hours={hours}
          />
          <div className="space-y-1.5">
            <label className="caption">Оплата</label>
            <PaymentControl
              amount={amount}
              paidAmount={paidAmount}
              onChange={({ paidAmount: p }) => setPaidAmount(p)}
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <label className="caption">Нотатка</label>
        <textarea
          className="field min-h-16 resize-none"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Необов'язково"
        />
      </div>

      {!confirmDel && (
        <button
          type="button"
          onClick={() => setConfirmDel(true)}
          className="flex items-center gap-1.5 py-2 text-sm font-medium text-danger"
        >
          <Trash2 size={16} /> Видалити запис
        </button>
      )}
    </Sheet>
  );
}
