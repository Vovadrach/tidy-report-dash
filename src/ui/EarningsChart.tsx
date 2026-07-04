import { monthName } from "@/domain/dates";
import type { MonthSummary } from "@/domain/stats";

/**
 * SVG-бари заробітку за останні місяці (FR-4.3):
 * повний стовпчик = зароблено, насичений поверх = оплачено.
 */
export const EarningsChart = ({ months }: { months: MonthSummary[] }) => {
  const max = Math.max(...months.map((m) => m.earned), 1);
  const W = 100 / months.length;

  const label = months
    .map((m) => `${monthName(Number(m.month.slice(5, 7)) - 1)}: ${Math.round(m.earned)}€, оплачено ${Math.round(m.paid)}€`)
    .join("; ");

  return (
    <div>
      <svg
        viewBox="0 0 100 56"
        className="w-full h-36"
        role="img"
        aria-label={`Заробіток за місяцями. ${label}`}
        preserveAspectRatio="none"
      >
        {months.map((m, i) => {
          const hEarned = (m.earned / max) * 46;
          const hPaid = (m.paid / max) * 46;
          const x = i * W + W * 0.18;
          const bw = W * 0.64;
          return (
            <g key={m.month}>
              <rect
                x={x} y={48 - hEarned} width={bw} height={Math.max(hEarned, 0.5)}
                rx={1.5}
                className="fill-primary/20"
              />
              <rect
                x={x} y={48 - hPaid} width={bw} height={Math.max(hPaid, 0)}
                rx={1.5}
                className="fill-primary"
              />
            </g>
          );
        })}
      </svg>
      <div className="grid text-center" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
        {months.map((m) => (
          <span key={m.month} className="text-[10px] font-semibold text-muted-foreground">
            {monthName(Number(m.month.slice(5, 7)) - 1).slice(0, 3)}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" /> оплачено
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary/20 inline-block" /> зароблено
        </span>
      </div>
    </div>
  );
};
