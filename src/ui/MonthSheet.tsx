import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { Sheet } from "./Sheet";
import { Button, IconButton } from "./Button";
import { spring } from "./motion";

export type MonthPick = { year: number; month: number | null } | null;

/**
 * Вибір місяця: рік гортається стрілками, місяці — сітка 3×4.
 * Поточний місяць має акцентний тон, обраний — суцільний акцент.
 * Опційно: «Увесь рік» і «Весь час» (для звіту).
 */
export function MonthSheet({
  open, onOpenChange, value, now, onPick, allowYear, allowAll, title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: MonthPick;
  now: Date;
  onPick: (value: MonthPick) => void;
  allowYear?: boolean;
  allowAll?: boolean;
  title?: string;
}) {
  const { t, monthsShort } = useI18n();
  const [year, setYear] = useState(value?.year ?? now.getFullYear());
  useEffect(() => { if (open) setYear(value?.year ?? now.getFullYear()); }, [open, value, now]);
  const pick = (next: MonthPick) => { onPick(next); onOpenChange(false); };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title ?? t("month.title")}>
      <div className="mb-4 flex items-center justify-between rounded-[16px] bg-well p-1">
        <IconButton label={t("month.prevYear")} size="sm" variant="ghost" onClick={() => setYear((y) => y - 1)}><ChevronLeft size={18} strokeWidth={2.4} /></IconButton>
        <span className="text-headline num text-ink">{year}</span>
        <IconButton label={t("month.nextYear")} size="sm" variant="ghost" onClick={() => setYear((y) => y + 1)}><ChevronRight size={18} strokeWidth={2.4} /></IconButton>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {monthsShort.map((label, month) => {
          const selected = value?.year === year && value.month === month;
          const current = now.getFullYear() === year && now.getMonth() === month;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={selected}
              onClick={() => pick({ year, month })}
              className={cn("press relative h-12 rounded-[14px] text-callout font-semibold", !selected && (current ? "bg-accent-tint text-accent-ink" : "bg-well text-ink"))}
            >
              {selected && <motion.span layoutId="month-selected" transition={spring.control} className="absolute inset-0 rounded-[14px] bg-accent" />}
              <span className={cn("relative z-10", selected && "text-accent-on")}>{label}</span>
            </button>
          );
        })}
      </div>
      {(allowYear || allowAll) && (
        <div className="mt-4 flex gap-2 pb-1">
          {allowYear && (
            <Button size="sm" variant={value?.year === year && value.month === null ? "tonal" : "neutral"} onClick={() => pick({ year, month: null })}>
              {t("month.wholeYear")} {year}
            </Button>
          )}
          {allowAll && (
            <Button size="sm" variant={value === null ? "tonal" : "neutral"} onClick={() => pick(null)}>{t("dash.allTime")}</Button>
          )}
        </div>
      )}
    </Sheet>
  );
}
