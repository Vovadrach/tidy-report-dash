/** Тонка прогрес-лінія сплачено/зароблено (ДНК «Ясно» — лінія, не брусок). */
export function LineProgress({
  value,
  max,
  tone = "ok",
  className = "",
}: {
  value: number;
  max: number;
  tone?: "ok" | "neutral";
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`line-progress ${tone === "neutral" ? "neutral" : ""} ${className}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
