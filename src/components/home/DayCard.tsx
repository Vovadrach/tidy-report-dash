import { useState } from "react";
import { Clock, CalendarClock, Check, CircleCheck, CircleDashed, Circle } from "lucide-react";
import NumberFlow from "@number-flow/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { decimalToHours } from "@/utils/timeFormat";

export type DayItem = {
  reportId: string;
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  hours: number;
  amount: number;
  paidAmount: number;
  status: "paid" | "partial" | "unpaid";
  isPlanned: boolean;
  note?: string;
  workers: { name: string; color: string }[];
};

const STATUS = {
  paid: { tint: "tint-emerald", icon: CircleCheck, label: "Оплачено" },
  partial: { tint: "tint-amber", icon: CircleDashed, label: "Частково" },
  unpaid: { tint: "tint-rose", icon: Circle, label: "Не оплачено" },
} as const;

export const DayCard = ({
  day,
  index,
  onOpen,
  onStatus,
}: {
  day: DayItem;
  index: number;
  onOpen: () => void;
  onStatus: (dayId: string, status: DayItem["status"], paidAmount: number) => void;
}) => {
  const [partialMode, setPartialMode] = useState(false);
  const [amt, setAmt] = useState("");
  const delay = { animationDelay: `${Math.min(index * 0.035, 0.22)}s` };

  if (day.isPlanned) {
    return (
      <button
        type="button"
        onClick={onOpen}
        style={delay}
        className="press rise-in w-full rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-4 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-foreground">{day.clientName}</span>
          <span className="tint-amber inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold">
            <CalendarClock size={13} strokeWidth={2.4} /> Заплановано
          </span>
        </div>
        {day.note && <p className="mt-1 truncate text-sm text-muted-foreground">{day.note}</p>}
      </button>
    );
  }

  const st = STATUS[day.status];
  const StatusIcon = st.icon;

  const applyPartial = () => {
    const value = Math.min(Math.max(0, parseFloat(amt.replace(",", ".")) || 0), day.amount);
    onStatus(day.id, value <= 0 ? "unpaid" : value >= day.amount ? "paid" : "partial", value);
    setPartialMode(false);
    setAmt("");
  };

  return (
    <div className="card-flat rise-in overflow-hidden rounded-2xl" style={delay}>
      <div className="flex items-center gap-3 p-3.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`ibadge press h-9 w-9 ${st.tint}`} aria-label="Статус оплати">
              <StatusIcon size={19} strokeWidth={2.4} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-xl">
            <DropdownMenuItem onClick={() => onStatus(day.id, "paid", day.amount)}>
              <CircleCheck size={16} className="text-success" /> Оплачено
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setPartialMode(true); setAmt(String(day.paidAmount || "")); }}>
              <CircleDashed size={16} className="text-warning" /> Частково…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatus(day.id, "unpaid", 0)}>
              <Circle size={16} className="text-destructive" /> Не оплачено
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="truncate font-semibold text-foreground">{day.clientName}</div>
          {day.workers.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {day.workers.map((w, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: w.color }} />
                  {w.name}
                </span>
              ))}
            </div>
          )}
          {day.note && <div className="mt-0.5 truncate text-xs text-muted-foreground">{day.note}</div>}
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="tint-violet inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold">
            <Clock size={13} strokeWidth={2.4} />
            {decimalToHours(day.hours)}
          </span>
          <span className="tint-blue inline-flex items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold">
            <NumberFlow value={Math.round(day.amount)} />€
          </span>
        </div>
      </div>

      {partialMode && (
        <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-3.5 py-2.5">
          <input
            autoFocus
            inputMode="decimal"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            placeholder="Отримано, €"
            className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            onKeyDown={(e) => e.key === "Enter" && applyPartial()}
          />
          <button
            type="button"
            onClick={applyPartial}
            className="press flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <Check size={18} strokeWidth={2.6} />
          </button>
        </div>
      )}
    </div>
  );
};
