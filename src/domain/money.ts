import type { PaymentStatus, WorkDay } from "./types";

/**
 * Фінансовий домен: єдине місце розрахунків оплат і часток.
 * (R-2: інваріант статусу тримається тут, а не тригером БД.)
 */

/** Статус — похідний від оплаченого/повного (V3-SPEC §6.1, інваріант). */
export const resolveStatus = (paidAmount: number, amount: number): PaymentStatus => {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= amount) return "paid";
  return "partial";
};

export interface PartialPaymentResult {
  ok: boolean;
  error?: "invalid" | "exceeds";
  paidAmount: number;
  status: PaymentStatus;
}

/** Додати часткову оплату до дня. */
export const applyPartialPayment = (
  day: Pick<WorkDay, "amount" | "paidAmount">,
  add: number,
): PartialPaymentResult => {
  if (!Number.isFinite(add) || add <= 0) {
    return { ok: false, error: "invalid", paidAmount: day.paidAmount, status: resolveStatus(day.paidAmount, day.amount) };
  }
  const next = day.paidAmount + add;
  if (next > day.amount + 0.001) {
    return { ok: false, error: "exceeds", paidAmount: day.paidAmount, status: resolveStatus(day.paidAmount, day.amount) };
  }
  return { ok: true, paidAmount: next, status: resolveStatus(next, day.amount) };
};

export interface WorkerView {
  hours: number;
  amount: number;
  /** Пропорційно оплачена частка працівниці */
  paid: number;
  due: number;
}

/**
 * Погляд на день очима однієї працівниці (або всіх — workerId === "all").
 * Оплата ділиться пропорційно до частки суми.
 */
export const workerView = (day: WorkDay, workerId: string | "all"): WorkerView => {
  if (workerId === "all") {
    const paid = Math.min(day.paidAmount, day.amount);
    return { hours: day.hours, amount: day.amount, paid, due: day.amount - paid };
  }
  const a = day.assignments.find((x) => x.workerId === workerId);
  if (!a) return { hours: 0, amount: 0, paid: 0, due: 0 };
  const share = day.amount > 0 ? a.amount / day.amount : 0;
  const paid = Math.min(day.paidAmount * share, a.amount);
  return { hours: a.hours, amount: a.amount, paid, due: a.amount - paid };
};

/** День стосується працівниці? */
export const involvesWorker = (day: WorkDay, workerId: string | "all"): boolean =>
  workerId === "all" || day.assignments.some((a) => a.workerId === workerId);

export interface SplitEntry {
  workerId: string;
  amount: number;
}

export interface SplitValidation {
  valid: boolean;
  assigned: number;
  remainder: number;
  emptyWorkerIds: string[];
}

/** Валідація розподілу суми дня між працівницями. */
export const validateSplit = (total: number, entries: SplitEntry[]): SplitValidation => {
  const assigned = entries.reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0);
  const emptyWorkerIds = entries.filter((e) => !e.amount || e.amount <= 0).map((e) => e.workerId);
  const remainder = total - assigned;
  return {
    valid: entries.length === 0 || (Math.abs(remainder) < 0.01 && emptyWorkerIds.length === 0),
    assigned,
    remainder,
    emptyWorkerIds,
  };
};

export const round2 = (n: number): number => Math.round(n * 100) / 100;
