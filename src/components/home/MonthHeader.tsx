import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень",
];

/** Заголовок місяця v2 — стрілки впритул до назви, назва в Unbounded з яскравим градієнтом. */
export const MonthHeader = ({
  date,
  onPrev,
  onNext,
  onToday,
  isCurrent,
}: {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isCurrent: boolean;
}) => (
  <div className="flex items-center justify-center gap-1.5 pt-1">
    <button
      type="button"
      aria-label="Попередній місяць"
      onClick={onPrev}
      className="press flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
    >
      <ChevronLeft size={22} strokeWidth={2.4} />
    </button>

    <button type="button" onClick={onToday} className="press flex flex-col items-center px-1 leading-none">
      <span className="bg-gradient-to-r from-primary to-[hsl(280_84%_62%)] bg-clip-text font-display text-[1.7rem] font-semibold tracking-tight text-transparent">
        {MONTHS[date.getMonth()]}
      </span>
      <span className={`mt-1 text-xs font-semibold ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
        {date.getFullYear()}
        {!isCurrent && " · до поточного"}
      </span>
    </button>

    <button
      type="button"
      aria-label="Наступний місяць"
      onClick={onNext}
      className="press flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
    >
      <ChevronRight size={22} strokeWidth={2.4} />
    </button>
  </div>
);
