import type { PaymentStatus } from "@/domain/types";

interface StatusDropProps {
  status: PaymentStatus;
  className?: string;
}

/**
 * Фірмовий елемент Aria: краплина стану оплати (концепт §3.4).
 * Порожній контур → наполовину → повна.
 */
export const StatusDrop = ({ status, className = "w-[22px] h-[22px]" }: StatusDropProps) => {
  const color =
    status === "paid" ? "var(--success)" :
    status === "partial" ? "var(--warning)" : "var(--destructive)";

  // Крапля: гострий верх, кругле дно
  const drop = "M12 2.5 C 15.8 7 19 10.8 19 14.6 A 7 7 0 0 1 5 14.6 C 5 10.8 8.2 7 12 2.5 Z";

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <clipPath id="drop-half">
          <rect x="0" y="12" width="24" height="12" />
        </clipPath>
      </defs>
      <path d={drop} fill={status === "paid" ? color : "transparent"} stroke={color} strokeWidth="2" />
      {status === "partial" && (
        <path d={drop} fill={color} clipPath="url(#drop-half)" />
      )}
    </svg>
  );
};
