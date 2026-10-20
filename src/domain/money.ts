import type { PaymentStatus, WorkDay } from "./types";

export const toCents = (amount: number): number => Math.sign(amount) * Math.round((Math.abs(amount) + Number.EPSILON * Math.max(1, Math.abs(amount))) * 100);
export const round2 = (amount: number): number => toCents(amount) / 100;
/** Account in whole euros, rounding each work entry before adding totals. */
export const toWholeEuros = (amount: number): number => Math.sign(amount) * Math.round(Math.abs(amount) + Number.EPSILON * Math.max(1, Math.abs(amount)));
export const parseNumber = (value: string): number => {
  const normalized = value.trim().replace(",", ".");
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : NaN;
};
const moneyFormatter = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });
export const formatMoney = (amount: number): string => moneyFormatter.format(toWholeEuros(amount));
export const calculateAmount = (hours: number, rate: number): number => toWholeEuros(hours * rate);

export const resolveStatus = (paidAmount: number, amount: number): PaymentStatus => {
  if (!Number.isFinite(paidAmount) || toCents(paidAmount) <= 0) return "unpaid";
  return toCents(paidAmount) >= toCents(amount) ? "paid" : "partial";
};

export interface PartialPaymentResult {
  ok: boolean;
  error?: "invalid" | "exceeds";
  paidAmount: number;
  status: PaymentStatus;
}
export const applyPartialPayment = (day: Pick<WorkDay, "amount" | "paidAmount">, add: number): PartialPaymentResult => {
  const unchanged = { paidAmount: day.paidAmount, status: resolveStatus(day.paidAmount, day.amount) };
  if (!Number.isFinite(add) || !Number.isFinite(day.amount) || !Number.isFinite(day.paidAmount) || day.amount < 0 || day.paidAmount < 0 || toCents(add) <= 0) return { ...unchanged, ok: false, error: "invalid" };
  const next = toCents(day.paidAmount) + toCents(add);
  if (next > toCents(day.amount)) return { ...unchanged, ok: false, error: "exceeds" };
  return { ok: true, paidAmount: next / 100, status: resolveStatus(next / 100, day.amount) };
};

/** Largest remainders keep the sum of all shares exact, including the final cent. */
export const allocateUnits = (total: number, weights: number[]): number[] => {
  const sum = weights.reduce((n, weight) => n + Math.max(0, weight), 0);
  if (!weights.length) return [];
  const exact = weights.map(weight => total * (sum > 0 ? Math.max(0, weight) / sum : 1 / weights.length));
  const result = exact.map(Math.floor);
  let remainder = total - result.reduce((n, value) => n + value, 0);
  const order = exact.map((value, index) => ({ index, fraction: value - result[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remainder-- <= 0) break;
    result[index]++;
  }
  return result;
};

/** Historical cents stay in storage; sub-euro residuals do not create debt. */
export const paymentView = (amount: number, paidAmount: number): { amount: number; paid: number; due: number } => {
  const amountCents = toCents(amount);
  const paidCents = Math.max(0, Math.min(toCents(paidAmount), amountCents));
  const total = toWholeEuros(amount);
  const paid = amountCents - paidCents < 100 ? total : Math.min(total, toWholeEuros(paidCents / 100));
  return { amount: total, paid, due: total - paid };
};

export interface WorkerView { hours: number; amount: number; paid: number; due: number }
export const assignmentViews = (day: WorkDay): WorkerView[] => {
  const total = paymentView(day.amount, day.paidAmount);
  const weights = day.assignments.map(a => toCents(a.amount));
  // Include any unassigned money so assigned workers cannot receive its share.
  weights.push(Math.max(0, toCents(day.amount) - weights.reduce((sum, amount) => sum + amount, 0)));
  const amounts = allocateUnits(total.amount, weights);
  const payments = allocateUnits(total.paid, amounts);
  return day.assignments.map((assignment, index) => ({
    hours: assignment.hours, amount: amounts[index], paid: payments[index], due: amounts[index] - payments[index],
  }));
};
export const workerView = (day: WorkDay, workerId: string | "all"): WorkerView => {
  if (workerId === "all") return { hours: day.hours, ...paymentView(day.amount, day.paidAmount) };
  const index = day.assignments.findIndex(a => a.workerId === workerId);
  if (index < 0) return { hours: 0, amount: 0, paid: 0, due: 0 };
  return assignmentViews(day)[index];
};
export const involvesWorker = (day: WorkDay, workerId: string | "all"): boolean =>
  workerId === "all" || day.assignments.some(a => a.workerId === workerId);

export interface SplitEntry { workerId: string; amount: number }
export interface SplitValidation { valid: boolean; assigned: number; remainder: number; emptyWorkerIds: string[] }
export const validateSplit = (total: number, entries: SplitEntry[]): SplitValidation => {
  const assigned = entries.reduce((sum, entry) => sum + (Number.isFinite(entry.amount) ? toCents(entry.amount) : 0), 0);
  const emptyWorkerIds = entries.filter(entry => !Number.isFinite(entry.amount) || toCents(entry.amount) <= 0).map(entry => entry.workerId);
  const remainder = toCents(total) - assigned;
  return {
    valid: Number.isFinite(total) && total >= 0 && (entries.length === 0 || (remainder === 0 && emptyWorkerIds.length === 0 && new Set(entries.map(e => e.workerId)).size === entries.length)),
    assigned: assigned / 100, remainder: remainder / 100, emptyWorkerIds,
  };
};
