import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { formatMonthYear } from "@/domain/dates";

export type PeriodMode = "month" | "year" | "all";

interface PeriodChipsProps {
  mode: PeriodMode;
  monthAnchor: Date;
  onModeChange: (mode: PeriodMode) => void;
  onMonthShift: (delta: number) => void;
}

/** Чипи періоду «Місяць · Рік · Весь час» + стрілки місяця (FR-4.1). */
export const PeriodChips = ({ mode, monthAnchor, onModeChange, onMonthShift }: PeriodChipsProps) => (
  <div className="space-y-2">
    <div className="flex gap-1.5 justify-center">
      {([
        ["month", "Місяць"],
        ["year", "Рік"],
        ["all", "Весь час"],
      ] as const).map(([value, label]) => (
        <button
          key={value}
          onClick={() => onModeChange(value)}
          className={`px-4 h-9 rounded-full text-sm font-bold transition-all active:scale-95 ${
            mode === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card border border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          {label}
        </button>
      ))}
    </div>

    {mode === "month" && (
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => onMonthShift(-1)}
          className="p-2 rounded-full text-primary hover:bg-primary/10 active:scale-90 transition-all"
          aria-label="Попередній місяць"
        >
          <CaretLeft className="w-4 h-4" />
        </button>
        <span className="display text-base text-foreground min-w-[10rem] text-center">
          {formatMonthYear(monthAnchor)}
        </span>
        <button
          onClick={() => onMonthShift(1)}
          className="p-2 rounded-full text-primary hover:bg-primary/10 active:scale-90 transition-all"
          aria-label="Наступний місяць"
        >
          <CaretRight className="w-4 h-4" />
        </button>
      </div>
    )}
  </div>
);
