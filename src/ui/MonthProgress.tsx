/** Тонкий прогрес оплат періоду: скільки з заробленого вже отримано (FR-1.1). */
interface MonthProgressProps {
  earned: number;
  paid: number;
}

export const MonthProgress = ({ earned, paid }: MonthProgressProps) => {
  if (earned <= 0) return null;
  const pct = Math.min(paid / earned, 1) * 100;
  const done = pct >= 99.5;

  return (
    <div className="mt-2.5" aria-label={`Оплачено ${Math.round(paid)} з ${Math.round(earned)} євро`}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="caption-label">Оплачено</span>
        <span className={`text-xs font-bold tabular-nums ${done ? "text-success" : "text-foreground"}`}>
          {Math.round(paid)} з {Math.round(earned)} €
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${done ? "bg-success" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
