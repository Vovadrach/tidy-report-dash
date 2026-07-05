import { Clock } from "lucide-react";
import { formatEuro, formatHours } from "./format";
import { STATUS_LABEL, STATUS_PILL, type DotStatus } from "./status";

/** Сума в €: чорнило + € у --ink-3, tabular. Колір суми НЕ залежить від розміру. */
export function Money({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`tnum ${className}`}>
      {formatEuro(value)}
      <span className="text-ink-3">&nbsp;€</span>
    </span>
  );
}

/** Години з іконкою: "4:30 г". Нуль → нічого. */
export function HoursBadge({ hours }: { hours: number }) {
  if (!hours) return null;
  return (
    <span className="badge-hours">
      <Clock size={14} strokeWidth={1.75} />
      {formatHours(hours)}
    </span>
  );
}

/** Пігулка статусу оплати — єдиний вигляд усюди. */
export function StatusPill({ status }: { status: DotStatus }) {
  return <span className={`pill ${STATUS_PILL[status]}`}>{STATUS_LABEL[status]}</span>;
}
