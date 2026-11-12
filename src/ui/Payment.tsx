import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { PaymentStatus } from "@/domain/types";
import { MoneyNumber } from "./MoneyNumber";
import { StatusMark } from "./StatusMark";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { TextInput } from "./Field";
import { reveal, spring } from "./motion";

/** Смуга оплати: зелена частина — сплачено, решта — борг. */
export const PaymentBar = ({ amount, paid, className }: { amount: number; paid: number; className?: string }) => {
  const share = amount > 0 ? Math.min(1, Math.max(0, paid / amount)) : 0;
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-alert-tint", className)}>
      <motion.div className="h-full rounded-full bg-ok" initial={false} animate={{ width: `${share * 100}%` }} transition={spring.expand} />
    </div>
  );
};

/** Підсумок оплати: «Сплачено 20 з 48 €» + залишок. */
export const PaymentSummary = ({ amount, paid, due }: { amount: number; paid: number; due: number }) => {
  const { t } = useI18n();
  return (
    <div className="rounded-[16px] bg-well p-3.5">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="text-footnote font-semibold text-ink-2">{t("pay.progress", { paid: Math.round(paid), total: Math.round(amount) })}</span>
        <span className="text-footnote font-semibold text-alert-ink">{t("common.due")} <span className="num"><MoneyNumber value={due} /></span> €</span>
      </div>
      <PaymentBar amount={amount} paid={paid} />
    </div>
  );
};

/**
 * Введення отриманої частини: поле + швидкий чіп «Решта N €» + «Додати».
 * Керується власником (значення і ключ операції живуть у ньому — щоб повтор
 * після збою не задвоїв оплату).
 */
export const PartialEntry = ({
  value, onChange, onSubmit, due, pending, autoFocus,
}: { value: string; onChange: (value: string) => void; onSubmit: () => void; due: number; pending?: boolean; autoFocus?: boolean }) => {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) { const id = setTimeout(() => input.current?.focus(), 220); return () => clearTimeout(id); } }, [autoFocus]);
  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <TextInput
          ref={input}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }}
          aria-label={t("common.received")}
          placeholder={t("common.received")}
          disabled={pending}
          suffix="€"
          wrapClassName="flex-1"
          className="num"
        />
        <Button variant="primary" size="lg" className="h-12 px-5" disabled={pending || !value} onClick={onSubmit} aria-label={t("common.add")}>
          {t("common.add")}
        </Button>
      </div>
      {due > 0 && (
        <button type="button" onClick={() => onChange(String(due))} disabled={pending}
          className="press rounded-full bg-well px-3 py-1.5 text-footnote font-semibold text-ink-2">
          {t("pay.rest")} <span className="num">{due}</span> €
        </button>
      )}
    </div>
  );
};

const OPTION: { status: PaymentStatus; label: string; hint: string }[] = [
  { status: "paid", label: "status.paid", hint: "pay.full" },
  { status: "partial", label: "status.partial", hint: "pay.partialHint" },
  { status: "unpaid", label: "status.unpaid", hint: "pay.none" },
];

/**
 * Лист оплати для рядка у списку (стрічка, борги клієнта).
 * «Оплачено» / «Не оплачено» застосовуються одразу й закривають лист.
 * «Частково» розгортає під собою введення суми — лист закривається після
 * успішного «Додати». Поточний стан позначено галочкою.
 */
export function PaymentSheet({
  open, onOpenChange, title, subtitle, amount, paid, due, status,
  onSet, partialOpen, onPartialOpen, partial, pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  amount: number;
  paid: number;
  due: number;
  status: PaymentStatus;
  onSet: (status: "paid" | "unpaid") => void;
  partialOpen: boolean;
  onPartialOpen: (open: boolean) => void;
  partial: { value: string; onChange: (value: string) => void; onSubmit: () => void };
  pending?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={subtitle}>
      <PaymentSummary amount={amount} paid={paid} due={due} />
      <div className="mt-2">
        <div className="list -mx-1 [--list-inset:3.75rem]">
          {OPTION.map((option) => {
            const current = option.status === status;
            const expanded = option.status === "partial" && partialOpen;
            return (
              <div key={option.status}>
                <button
                  type="button"
                  aria-label={t(option.label)}
                  aria-expanded={option.status === "partial" ? expanded : undefined}
                  disabled={pending}
                  onClick={() => option.status === "partial" ? onPartialOpen(!partialOpen) : onSet(option.status)}
                  className="tap flex w-full items-center gap-3 rounded-[16px] px-1 py-2.5 text-left disabled:opacity-50"
                >
                  <StatusMark status={option.status} fraction={0.5} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-headline text-ink">{t(option.label)}</span>
                    <span className="block text-footnote text-ink-3">{t(option.hint)}</span>
                  </span>
                  {current && (
                    <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.pop}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-on">
                      <Check size={14} strokeWidth={3} />
                    </motion.span>
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div {...reveal} className="overflow-hidden">
                      <div className="px-1 pb-3 pt-1">
                        <PartialEntry {...partial} due={due} pending={pending} autoFocus />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
