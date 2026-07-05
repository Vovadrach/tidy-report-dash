import { monthName } from "@/domain/dates";
import type { MonthSummary } from "@/domain/stats";
import { formatEuro } from "./format";

/** Графік 6 місяців «Ясно»: світла смуга — зароблено, зелена — сплачено. Власний SVG-less. */
export function MonthsChart({ months }: { months: MonthSummary[] }) {
  const max = Math.max(1, ...months.map((m) => m.earned));
  return (
    <div className="flex h-36 items-end justify-between gap-1.5">
      {months.map((m) => {
        const mi = parseInt(m.month.slice(5, 7), 10) - 1;
        const eH = (m.earned / max) * 100;
        const pH = (m.paid / max) * 100;
        return (
          <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="caption text-[0.62rem] tnum">
              {m.earned > 0 ? formatEuro(m.earned) : ""}
            </span>
            <div className="relative flex h-24 w-full max-w-9 items-end">
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-md"
                style={{ height: `${eH}%`, background: "color-mix(in oklab, var(--ok) 16%, transparent)" }}
              />
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-md bg-ok"
                style={{ height: `${pH}%` }}
              />
            </div>
            <span className="caption text-[0.65rem]">{monthName(mi).slice(0, 3)}</span>
          </div>
        );
      })}
    </div>
  );
}
