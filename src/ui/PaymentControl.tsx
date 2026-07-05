import { resolveStatus, round2 } from "@/domain/money";
import type { PaymentStatus } from "@/domain/types";
import { Segmented, type SegTone } from "./Segmented";
import { Money } from "./atoms";

/**
 * PaymentControl — ЄДИНИЙ віджет статусу оплати «Ясно» (фікс B4).
 * Один порядок усюди: Оплачено · Частково · Не оплачено.
 * «Частково» відкриває ввід суми; статус — завжди похідний (resolveStatus).
 */
const OPTIONS: { value: PaymentStatus; label: string; tone: SegTone }[] = [
  { value: "paid", label: "Оплачено", tone: "ok" },
  { value: "partial", label: "Частково", tone: "warn" },
  { value: "unpaid", label: "Не оплачено", tone: "danger" },
];

export function PaymentControl({
  amount,
  paidAmount,
  onChange,
}: {
  amount: number;
  paidAmount: number;
  onChange: (next: { paidAmount: number; status: PaymentStatus }) => void;
}) {
  const status = resolveStatus(paidAmount, amount);

  const pick = (s: PaymentStatus) => {
    if (s === "paid") onChange({ paidAmount: amount, status: "paid" });
    else if (s === "unpaid") onChange({ paidAmount: 0, status: "unpaid" });
    else {
      const seed = paidAmount > 0 && paidAmount < amount ? paidAmount : round2(amount / 2);
      onChange({ paidAmount: seed, status: "partial" });
    }
  };

  const setPartial = (raw: number) => {
    const p = round2(Math.min(Math.max(0, raw), amount));
    onChange({ paidAmount: p, status: resolveStatus(p, amount) });
  };

  return (
    <div className="space-y-2">
      <Segmented<PaymentStatus> options={OPTIONS} value={status} onChange={pick} />
      {status === "partial" && (
        <div className="space-y-1.5 pt-0.5">
          <div className="relative">
            <input
              inputMode="decimal"
              value={paidAmount ? String(paidAmount) : ""}
              onChange={(e) => setPartial(parseFloat(e.target.value.replace(",", ".")) || 0)}
              placeholder="Отримано"
              className="field pr-9"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">€</span>
          </div>
          <p className="caption">
            Залишок: <Money value={Math.max(0, round2(amount - paidAmount))} />
          </p>
        </div>
      )}
    </div>
  );
}
