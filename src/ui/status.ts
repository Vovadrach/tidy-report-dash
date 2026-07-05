import type { PaymentStatus } from "@/domain/types";

/** Статус оплати + «planned» як єдиний словник міток/тонів. */
export type DotStatus = PaymentStatus | "planned";

export const STATUS_LABEL: Record<DotStatus, string> = {
  paid: "Оплачено",
  partial: "Частково",
  unpaid: "Не оплачено",
  planned: "Заплановано",
};

export const STATUS_PILL: Record<DotStatus, string> = {
  paid: "pill-ok",
  partial: "pill-warn",
  unpaid: "pill-danger",
  planned: "pill-info",
};

export const STATUS_TONE: Record<DotStatus, string> = {
  paid: "var(--ok)",
  partial: "var(--warn)",
  unpaid: "var(--danger)",
  planned: "var(--info)",
};
