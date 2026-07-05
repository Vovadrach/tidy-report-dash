import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useClients, useCreateWorkEntry } from "@/data/queries";
import { todayLocal } from "@/domain/dates";
import { resolveStatus, round2 } from "@/domain/money";
import { Sheet } from "@/ui/Sheet";
import { Button } from "@/ui/Button";
import { HoursField } from "@/ui/HoursField";
import { AmountField, type AmountMode } from "@/ui/AmountField";
import { PaymentControl } from "@/ui/PaymentControl";

/**
 * QuickAddSheet — додати/запланувати запис одним кроком (фікс B6/B7).
 * hours>0 → «Зберегти»; hours=0 → «Запланувати роботу».
 * Тут живуть єдині елементи годин і грошей (B2/B3/B4).
 */
export function QuickAddSheet({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefill?: { clientId?: string; date?: string };
}) {
  const { data: clients = [] } = useClients();
  const create = useCreateWorkEntry();

  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [hours, setHours] = useState(0);
  const [mode, setMode] = useState<AmountMode>("fromHours");
  const [amountInput, setAmountInput] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setClientId(prefill?.clientId ?? "");
    setDate(prefill?.date ?? todayLocal());
    setHours(0);
    setMode("fromHours");
    setAmountInput(0);
    setPaidAmount(0);
    setNote("");
  }, [open, prefill]);

  const client = clients.find((c) => c.id === clientId);
  const rate = client?.hourlyRate ?? 0;
  const amount = mode === "fromHours" ? round2(hours * rate) : amountInput;
  const status = resolveStatus(paidAmount, amount);

  const switchMode = (m: AmountMode) => {
    if (m === "fromAmount") setAmountInput(amount);
    setMode(m);
  };

  const submit = (planned: boolean) => {
    if (!client) {
      toast.error("Оберіть клієнта");
      return;
    }
    if (!planned && paidAmount > amount + 0.01) {
      toast.error("Оплата більша за суму");
      return;
    }
    create.mutate(
      {
        clientId: client.id,
        clientName: client.name,
        date,
        hours: planned ? 0 : hours,
        amount: planned ? 0 : amount,
        status: planned ? "unpaid" : status,
        paidAmount: planned ? 0 : paidAmount,
        isPlanned: planned,
        note: note.trim() || undefined,
        assignments: [],
      },
      {
        onSuccess: () => {
          toast.success(planned ? "Заплановано" : "Запис додано");
          onOpenChange(false);
        },
      },
    );
  };

  const isPlan = hours === 0;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Новий запис"
      description="Додати або запланувати роботу"
      footer={
        isPlan ? (
          <Button
            variant="ghost"
            block
            disabled={!clientId || create.isPending}
            onClick={() => submit(true)}
          >
            Запланувати роботу
          </Button>
        ) : (
          <Button block disabled={!clientId || create.isPending} onClick={() => submit(false)}>
            Зберегти
          </Button>
        )
      }
    >
      <div className="space-y-1.5">
        <label className="caption">Клієнт</label>
        <select className="field" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="" disabled>
            Оберіть клієнта
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

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

      {!isPlan && (
        <>
          <AmountField
            value={amount}
            onChange={setAmountInput}
            mode={mode}
            onModeChange={switchMode}
            rate={rate}
            hours={hours}
          />

          {amount > 0 && (
            <div className="space-y-1.5">
              <label className="caption">Оплата</label>
              <PaymentControl
                amount={amount}
                paidAmount={paidAmount}
                onChange={({ paidAmount: p }) => setPaidAmount(p)}
              />
            </div>
          )}
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
    </Sheet>
  );
}
