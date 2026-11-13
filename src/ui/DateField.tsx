import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { fromISODate, toISODate } from "@/domain/dates";
import { useToday } from "./useToday";
import { Sheet } from "./Sheet";
import { Button, IconButton } from "./Button";
import { IconFrame } from "./Screen";
import { dayLabel, shiftISO } from "./dateLabel";
import { spring } from "./motion";

/**
 * Календар у нижньому листі.
 * Відкриття: показує місяць обраної дати. Гортання: стрілки або свайп по сітці
 * (місяць виїжджає у напрямку руху). Сьогодні — акцентний тон, обраний день —
 * суцільний акцент, дні з записами — крапка. Тап по дню вибирає й закриває лист
 * (коротка пауза, щоб побачити вибір). «Сьогодні» / «Вчора» — швидкий вибір.
 */
export function CalendarSheet({
  open, onOpenChange, value, onChange, marks, title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (iso: string) => void;
  marks?: Set<string>;
  title?: string;
}) {
  const i18n = useI18n();
  const { t, months, monthsOf, weekdaysShort } = i18n;
  const today = useToday();
  const [view, setView] = useState(() => { const d = fromISODate(value); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [dir, setDir] = useState(0);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!open) return;
    const d = fromISODate(value);
    setView(new Date(d.getFullYear(), d.getMonth(), 1));
    setDir(0);
  }, [open, value]);
  useEffect(() => () => clearTimeout(closing.current), []);

  const move = (delta: number) => { setDir(delta); setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1)); };
  const pick = (iso: string) => {
    onChange(iso);
    clearTimeout(closing.current);
    closing.current = setTimeout(() => onOpenChange(false), 180);
  };

  const year = view.getFullYear();
  const month = view.getMonth();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title ?? t("date.title")} description={dayLabel(value, today, i18n)}>
      <div className="mb-3 flex items-center justify-between">
        <IconButton label={t("month.prev")} size="sm" onClick={() => move(-1)}><ChevronLeft size={18} strokeWidth={2.4} /></IconButton>
        <p className="text-headline text-ink">{months[month]} <span className="text-ink-3">{year}</span></p>
        <IconButton label={t("month.next")} size="sm" onClick={() => move(1)}><ChevronRight size={18} strokeWidth={2.4} /></IconButton>
      </div>
      <div className="grid grid-cols-7 pb-1">
        {order.map((d) => (
          <span key={d} className={cn("text-center text-caption font-semibold", d === 0 || d === 6 ? "text-ink-4" : "text-ink-3")}>{weekdaysShort[d]}</span>
        ))}
      </div>
      <div className="relative overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <motion.div
            key={`${year}-${month}`}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0, transition: spring.expand }}
            exit={{ opacity: 0, x: dir * -40, transition: { duration: 0.14 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 60) move(info.offset.x < 0 ? 1 : -1); }}
            className="grid touch-pan-y grid-cols-7 gap-y-1"
          >
            {cells.map((day, index) => {
              if (day === null) return <span key={`e${index}`} />;
              const iso = toISODate(new Date(year, month, day));
              const selected = iso === value;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  aria-label={`${day} ${monthsOf[month]} ${year}`}
                  aria-pressed={selected}
                  onClick={() => pick(iso)}
                  className="press relative mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full"
                >
                  {selected && <motion.span layoutId="calendar-selected" transition={spring.control} className="absolute inset-0 rounded-full bg-accent" />}
                  {!selected && isToday && <span className="absolute inset-0 rounded-full bg-accent-tint" />}
                  <span className={cn(
                    "relative z-10 text-body num",
                    selected ? "font-semibold text-accent-on" : isToday ? "font-bold text-accent-ink" : "text-ink",
                  )}>{day}</span>
                  {marks?.has(iso) && (
                    <span className={cn("absolute bottom-1.5 z-10 h-1 w-1 rounded-full", selected ? "bg-accent-on" : "bg-ink-4")} />
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-4 flex gap-2 pb-1">
        <Button variant={value === today ? "tonal" : "neutral"} size="sm" onClick={() => pick(today)}>{t("common.today")}</Button>
        <Button variant={value === shiftISO(today, -1) ? "tonal" : "neutral"} size="sm" onClick={() => pick(shiftISO(today, -1))}>{t("common.yesterday")}</Button>
      </div>
    </Sheet>
  );
}

/** Рядок дати у формі: показує людську дату, тап відкриває календар. */
export function DateField({
  value, onChange, label, marks, disabled,
}: { value: string; onChange: (iso: string) => void; label: string; marks?: Set<string>; disabled?: boolean }) {
  const i18n = useI18n();
  const today = useToday();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={label}
        value={value}
        data-value={value}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="tap flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left disabled:opacity-50"
      >
        <IconFrame tone="accent" size="sm"><CalendarDays size={16} strokeWidth={2.2} /></IconFrame>
        <span className="flex-1 text-body text-ink">{i18n.t("common.date")}</span>
        <span className="text-callout font-medium text-ink-2">{dayLabel(value, today, i18n)}</span>
        <ChevronRight size={18} className="shrink-0 text-ink-4" />
      </button>
      <CalendarSheet open={open} onOpenChange={setOpen} value={value} onChange={onChange} marks={marks} />
    </>
  );
}
