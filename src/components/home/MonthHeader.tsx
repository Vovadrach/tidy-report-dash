import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { Button, IconButton } from "@/ui/Button";
import { spring } from "@/ui/motion";

/**
 * Заголовок стрічки: місяць великим титулом (тап → вибір місяця), рік поруч,
 * стрілки праворуч. Коли відкрито не поточний місяць — з'являється «До поточного».
 * Назва місяця змінюється зсувом у бік гортання.
 */
export const MonthHeader = ({
  date, onPrev, onNext, onToday, onPick, isCurrent, direction = 0,
}: {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPick: () => void;
  isCurrent: boolean;
  direction?: number;
}) => {
  const { t, months } = useI18n();
  return (
    <div className="flex items-center gap-2 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <button type="button" onClick={onPick} aria-label={t("month.title")} className="press -ml-1 flex min-w-0 flex-1 items-baseline gap-2 rounded-[12px] px-1 py-0.5 text-left">
        <span className="relative overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.span
              key={`${date.getFullYear()}-${date.getMonth()}`}
              initial={{ opacity: 0, y: direction * 14 }}
              animate={{ opacity: 1, y: 0, transition: spring.expand }}
              exit={{ opacity: 0, y: direction * -14, transition: { duration: 0.12 } }}
              className="block text-title text-ink"
            >
              {months[date.getMonth()]}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="num text-headline font-medium text-ink-3">{date.getFullYear()}</span>
        <ChevronDown size={18} strokeWidth={2.4} className="shrink-0 self-center text-ink-4" />
      </button>
      {!isCurrent && (
        <Button size="sm" variant="tonal" onClick={onToday} className="fade-in">{t("common.today")}</Button>
      )}
      <IconButton label={t("month.prev")} variant="surface" size="md" onClick={onPrev}><ChevronLeft size={20} strokeWidth={2.4} /></IconButton>
      <IconButton label={t("month.next")} variant="surface" size="md" onClick={onNext}><ChevronRight size={20} strokeWidth={2.4} /></IconButton>
    </div>
  );
};
