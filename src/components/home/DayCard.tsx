import { useState, useRef } from "react";
import { applyPartialPayment, parseNumber } from "@/domain/money";
import { toast } from "sonner";
import { Clock, CalendarClock, Check, CircleCheck, CircleDashed, Circle } from "lucide-react";
import { MoneyNumber } from '@/ui/MoneyNumber';
import { motion } from "motion/react";
import { useI18n } from "@/i18n";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
  onAddPartial,
  pending = false,
  canEdit = true,
}: {
  day: DayItem;
  index: number;
  onOpen: () => void;
  onStatus: (dayId: string, status: DayItem["status"], paidAmount: number) => Promise<void>;
  onAddPartial: (dayId: string, amount: number, operationId: string) => Promise<void>;
  pending?: boolean;
  canEdit?: boolean;
}) => {
  const { t } = useI18n();
  const [partialMode, setPartialMode] = useState(false);
  const [amt, setAmt] = useState("");
  const busy = useRef(false);
  const request = useRef<{ amount: number; id: string } | null>(null);
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
            <CalendarClock size={13} strokeWidth={2.4} /> {t("common.planned")}
          </span>
        </div>
        {day.note && <p className="mt-1 truncate text-sm text-muted-foreground">{day.note}</p>}
      </button>
    );
  }

  const st = STATUS[day.status];
  const StatusIcon = st.icon;

  const commitStatus = async (status: DayItem['status'], paidAmount: number) => {
    if (busy.current || pending || !canEdit) return;
    busy.current = true;
    try { await onStatus(day.id,status,paidAmount); }
    catch { /* The mutation reports the error and leaves the card unchanged. */ }
    finally { busy.current = false; }
  };
  const applyPartial = async () => {
    if (busy.current || pending || !canEdit) return;
    const amount = parseNumber(amt);
    const result = applyPartialPayment({ amount: day.amount,paidAmount: day.paidAmount },amount);
    if (!result.ok) { toast.error(result.error === 'exceeds' ? t('toast.overAmount') : t('common.error')); return; }
    if (request.current?.amount !== amount) request.current = { amount,id: crypto.randomUUID() };
    busy.current = true;
    try {
      await onAddPartial(day.id,amount,request.current!.id);
      request.current = null; setPartialMode(false); setAmt('');
    } catch { /* Preserve input and the operation key for retry. */ }
    finally { busy.current = false; }
  };

  return (
    <div data-day-card={day.id} className="card-flat rise-in overflow-hidden rounded-2xl" style={delay}>
      <div className="flex items-center gap-3 p-3.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button disabled={pending || !canEdit} className={`ibadge press h-9 w-9 transition-colors ${st.tint}`} aria-label={t('common.status')}>
              <motion.span
                key={day.status}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
              >
                <StatusIcon size={19} strokeWidth={2.4} />
              </motion.span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-xl">
            <DropdownMenuItem onClick={() => void commitStatus("paid", day.amount)}>
              <CircleCheck size={16} className="text-success" /> {t("status.paid")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setPartialMode(true); setAmt(""); }}>
              <CircleDashed size={16} className="text-warning" /> {t("status.partial")}…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void commitStatus("unpaid", 0)}>
              <Circle size={16} className="text-destructive" /> {t("status.unpaid")}
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
            <MoneyNumber value={day.amount} />€
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
            aria-label={t('common.received')} placeholder={t('common.received')}
            disabled={pending}
            className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            onKeyDown={(e) => e.key === "Enter" && applyPartial()}
          />
          <button
            type="button"
            onClick={() => void applyPartial()}
            aria-label={t('common.add')}
            disabled={pending || !amt}
            className="press flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <Check size={18} strokeWidth={2.6} />
          </button>
        </div>
      )}
    </div>
  );
};
