import { CalendarClock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/domain/types";
import type { Tone } from "./Button";

export const STATUS_TONE: Record<PaymentStatus, Tone> = { paid: "ok", partial: "warn", unpaid: "alert" };

const FRAME: Record<PaymentStatus | "planned", string> = {
  paid: "bg-ok-tint text-ok",
  partial: "bg-warn-tint text-warn",
  unpaid: "bg-alert-tint text-alert",
  planned: "bg-well text-ink-3",
};

const R = 7.25;
const C = 2 * Math.PI * R;

/**
 * Позначка оплати — кільце, що наповнюється разом з оплатою:
 * порожнє (борг) → дуга частки (частково) → повне з галочкою (оплачено).
 * Тож частку видно одразу, без цифр.
 */
export const StatusMark = ({
  status, fraction = 0, planned, size = 36, className,
}: { status: PaymentStatus; fraction?: number; planned?: boolean; size?: number; className?: string }) => {
  if (planned) {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full", FRAME.planned, className)} style={{ width: size, height: size }}>
        <CalendarClock size={17} strokeWidth={2} />
      </span>
    );
  }
  const f = status === "paid" ? 1 : status === "unpaid" ? 0 : Math.min(0.92, Math.max(0.12, fraction));
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors", FRAME[status], className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden>
        <circle cx="10" cy="10" r={R} fill="none" stroke="currentColor" strokeOpacity={status === "paid" ? 1 : status === "unpaid" ? 0.5 : 0.28} strokeWidth="2.5" />
        {status === "partial" && (
          <circle
            cx="10" cy="10" r={R} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${C * f} ${C}`} transform="rotate(-90 10 10)"
            style={{ transition: "stroke-dasharray 0.5s cubic-bezier(0.22,1,0.36,1)" }}
          />
        )}
        {status === "paid" && <circle cx="10" cy="10" r="8.5" fill="currentColor" />}
      </svg>
      {status === "paid" && <Check size={12} strokeWidth={3.4} className="absolute text-surface" />}
    </span>
  );
};
