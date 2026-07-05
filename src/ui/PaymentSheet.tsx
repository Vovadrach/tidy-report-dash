import { useEffect, useState } from "react";
import { distributePayment, round2, type Allocation, type DayLike } from "@/domain/money";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { Money } from "./atoms";

/**
 * PaymentSheet — канонічне «застосування грошей» (нижній лист «Ясно»).
 * Lump-сума з чипами (Уся сума / +50 / +100), живий залишок, розподіл на
 * найстаріші несплачені дні (distributePayment, R6). Понад борг — недоступно.
 */
export function PaymentSheet({
  open,
  onOpenChange,
  clientName,
  days,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  days: DayLike[];
  onApply: (allocations: Allocation[]) => void;
}) {
  const totalDue = round2(
    days.reduce((s, d) => s + Math.max(0, d.amount - Math.min(d.paidAmount, d.amount)), 0),
  );
  const [amount, setAmount] = useState(totalDue);

  useEffect(() => {
    if (open) setAmount(totalDue);
  }, [open, totalDue]);

  const capped = round2(Math.min(Math.max(0, amount), totalDue));
  const remaining = round2(totalDue - capped);
  const { allocations } = distributePayment(days, capped);

  const confirm = () => {
    onApply(allocations);
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Оплата · ${clientName}`}
      description="Приймання оплати з розподілом на найстаріші несплачені дні"
      footer={
        <Button block disabled={capped <= 0} onClick={confirm}>
          Прийняти&nbsp;<Money value={capped} className="!text-accent-ink" />
        </Button>
      }
    >
      <div className="surface-card flex items-center justify-between p-4">
        <span className="caption">Загальний борг</span>
        <span className="display text-xl">
          <Money value={totalDue} />
        </span>
      </div>

      <div className="space-y-2">
        <label className="caption">Скільки отримала</label>
        <div className="relative">
          <input
            inputMode="decimal"
            value={amount ? String(amount) : ""}
            onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value.replace(",", ".")) || 0))}
            placeholder="0"
            className="field display pr-9 text-xl"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">€</span>
        </div>
        <div className="flex gap-2">
          <button type="button" className="pill pill-neutral" onClick={() => setAmount(totalDue)}>
            Уся сума
          </button>
          <button
            type="button"
            className="pill pill-neutral"
            onClick={() => setAmount((a) => round2(Math.min(totalDue, a + 50)))}
          >
            +50
          </button>
          <button
            type="button"
            className="pill pill-neutral"
            onClick={() => setAmount((a) => round2(Math.min(totalDue, a + 100)))}
          >
            +100
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
        <span className="text-ink-2">Залишок після оплати</span>
        <span className="tnum font-medium">
          <Money value={remaining} />
        </span>
      </div>
      {allocations.length > 0 && (
        <p className="caption">Покриє днів: {allocations.length}</p>
      )}
    </Sheet>
  );
}
