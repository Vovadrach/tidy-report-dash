import { useRef, useState } from "react";
import { toast } from "sonner";
import { applyPartialPayment, parseNumber, paymentView, round2 } from "@/domain/money";
import { decimalToHours } from "@/utils/timeFormat";
import { useI18n } from "@/i18n";
import { MoneyNumber } from "@/ui/MoneyNumber";
import { StatusMark } from "@/ui/StatusMark";
import { PaymentSheet } from "@/ui/Payment";
import { WorkerDot } from "@/ui/Avatar";

export type DayItem = {
  reportId: string;
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  hours: number;
  amount: number;
  paidAmount: number;
  /** Original amounts for idempotent payments against historical cent balances. */
  paymentBalance?: { amount: number; paidAmount: number };
  status: "paid" | "partial" | "unpaid";
  isPlanned: boolean;
  note?: string;
  workers: { name: string; color: string }[];
};

/**
 * Рядок запису в стрічці. Ліворуч — кільце оплати (тап → лист оплати),
 * посередині — клієнт і хто працював, праворуч — сума й години.
 * Тап по змісту відкриває день (або форму, якщо це план).
 * Рядок живе всередині картки дня й ділить її внутрішніми лініями.
 */
export const DayCard = ({
  day, onOpen, onStatus, onAddPartial, pending = false, canEdit = true, title, mode = "total",
}: {
  day: DayItem;
  index?: number;
  /** Заголовок рядка замість імені клієнта (у боргах клієнта — дата). */
  title?: string;
  /** total — сума запису; due — залишок боргу (червоним). */
  mode?: "total" | "due";
  onOpen: () => void;
  onStatus: (dayId: string, status: DayItem["status"], paidAmount: number) => Promise<void>;
  onAddPartial: (dayId: string, amount: number, operationId: string) => Promise<void>;
  pending?: boolean;
  canEdit?: boolean;
}) => {
  const { t } = useI18n();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [partialOpen, setPartialOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const busy = useRef(false);
  const request = useRef<{ amount: number; id: string } | null>(null);

  if (day.isPlanned) {
    return (
      <div data-planned-card={day.id}>
        <button type="button" onClick={onOpen} className="tap flex w-full items-center gap-3 px-4 py-3 text-left">
          <StatusMark status="unpaid" planned size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-headline text-ink">{day.clientName}</span>
            <span className="block truncate text-footnote text-ink-3">{day.note || t("day.status.planned")}</span>
          </span>
          <span className="shrink-0 rounded-full bg-well px-2.5 py-1 text-caption font-semibold text-ink-2">{t("common.planned")}</span>
        </button>
      </div>
    );
  }

  const balance = day.paymentBalance ?? day;
  const view = paymentView(day.amount, day.paidAmount);

  const close = () => { setSheetOpen(false); setPartialOpen(false); };
  const commitStatus = async (status: DayItem["status"], paidAmount: number) => {
    if (busy.current || pending || !canEdit) return;
    busy.current = true;
    try {
      await onStatus(day.id, status, paidAmount);
      if (status !== "partial") { request.current = null; setAmt(""); close(); }
    } catch { /* The mutation reports the error and leaves the row unchanged. */ }
    finally { busy.current = false; }
  };
  const applyPartial = async () => {
    if (busy.current || pending || !canEdit) return;
    const entered = parseNumber(amt);
    const payment = paymentView(balance.amount, balance.paidAmount);
    const amount = payment.due > 0 && entered === payment.due ? round2(balance.amount - balance.paidAmount) : entered;
    const result = applyPartialPayment(balance, amount);
    if (!result.ok) { toast.error(result.error === "exceeds" ? t("toast.overAmount") : t("common.error")); return; }
    if (request.current?.amount !== amount) request.current = { amount, id: crypto.randomUUID() };
    busy.current = true;
    try {
      await onAddPartial(day.id, amount, request.current!.id);
      request.current = null; setAmt(""); close();
    } catch { /* Preserve input and the operation key for retry. */ }
    finally { busy.current = false; }
  };

  return (
    <div data-day-card={day.id} className="flex items-stretch">
      <button
        type="button"
        disabled={pending || !canEdit}
        aria-label={t("common.status")}
        data-status={day.status}
        onClick={() => setSheetOpen(true)}
        className="press flex shrink-0 items-center py-3 pl-4 pr-1 disabled:cursor-default"
      >
        <StatusMark status={day.status} fraction={view.amount > 0 ? view.paid / view.amount : 0} size={40} />
      </button>

      <button type="button" onClick={onOpen} className="tap flex min-w-0 flex-1 items-center gap-3 py-3 pl-2 pr-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-headline text-ink">{title ?? day.clientName}</span>
          {day.workers.length > 0 && (
            <span className="mt-0.5 flex min-w-0 items-center gap-2 overflow-hidden text-footnote text-ink-3">
              {day.workers.map((w, i) => (
                <span key={i} className="inline-flex shrink-0 items-center gap-1"><WorkerDot color={w.color} />{w.name}</span>
              ))}
            </span>
          )}
          {day.note && <span className="mt-0.5 block truncate text-footnote text-ink-3">{day.note}</span>}
        </span>
        <span className="shrink-0 text-right">
          {mode === "due"
            ? <span className="block num text-headline text-alert-ink"><MoneyNumber value={view.due} /> €</span>
            : <span className="block num text-headline text-ink"><MoneyNumber value={day.amount} /> €</span>}
          <span className="block num text-footnote text-ink-3">{decimalToHours(day.hours)} {t("common.hoursShort")}</span>
        </span>
      </button>

      <PaymentSheet
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setPartialOpen(false); }}
        title={title ? `${day.clientName} · ${title}` : day.clientName}
        subtitle={`${decimalToHours(day.hours)} ${t("common.hoursShort")} · ${view.amount} €`}
        amount={view.amount}
        paid={view.paid}
        due={view.due}
        status={day.status}
        pending={pending}
        onSet={(status) => void commitStatus(status, status === "paid" ? day.amount : 0)}
        partialOpen={partialOpen}
        onPartialOpen={(open) => { setPartialOpen(open); if (open) setAmt(""); }}
        partial={{ value: amt, onChange: setAmt, onSubmit: () => void applyPartial() }}
      />
    </div>
  );
};
