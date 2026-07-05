import { motion } from "motion/react";
import { STATUS_TONE, type DotStatus } from "./status";

/**
 * StatusDot — крапка статусу оплати (ДНК «Ясно»).
 * unpaid → порожнє кільце · partial → напів-пиріг · paid → повний диск ·
 * planned → пунктирне кільце. Pop-scale при зміні статусу.
 * fraction (0..1) перекриває дефолт зі статусу для точної частки оплати.
 */
const FRAC: Record<DotStatus, number> = { paid: 1, partial: 0.5, unpaid: 0, planned: 0 };

export function StatusDot({
  status,
  fraction,
  size = 16,
}: {
  status: DotStatus;
  fraction?: number;
  size?: number;
}) {
  const f = Math.max(0, Math.min(1, fraction ?? FRAC[status]));
  const color = STATUS_TONE[status];
  const deg = Math.round(f * 360);
  return (
    <motion.span
      key={`${status}-${deg}`}
      initial={{ scale: 0.72 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 24 }}
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-block",
        flexShrink: 0,
        border: `1.5px ${status === "planned" ? "dashed" : "solid"} ${color}`,
        background: f > 0 ? `conic-gradient(${color} ${deg}deg, transparent 0)` : "transparent",
      }}
    />
  );
}
