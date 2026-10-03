import { z } from "zod";
import { isISODate } from "./dates";
import { resolveStatus, round2, toCents, validateSplit } from "./money";
import type { NewWorkEntry, WorkDayPatch } from "./types";

const money = z.number().finite().min(0).max(99_999_999.99).transform(round2);
const hours = z.number().finite().min(0).max(100.999999);
export const clientInput = z.object({
  name: z.string().trim().min(1, "Введіть ім’я клієнта").max(200),
  hourlyRate: money.refine(value => value > 0, "Ставка має бути більшою за нуль"),
});
export const workerInput = z.object({ name: z.string().trim().min(1).max(200), color: z.string().regex(/^#[0-9a-f]{6}$/i), isPrimary: z.boolean() });
const assignment = z.object({ workerId: z.string().min(1), hours, amount: money.refine(value => value > 0) });
const entry = z.object({
  requestId: z.string().uuid().optional(),
  clientId: z.string().min(1), clientName: z.string().trim().min(1),
  date: z.string().refine(isISODate, "Оберіть коректну дату"), hours, amount: money,
  hourlyRate: money.refine(value => value > 0).optional(),
  status: z.enum(["paid", "partial", "unpaid"]), paidAmount: money, isPlanned: z.boolean(),
  note: z.string().max(10_000).optional(), assignments: z.array(assignment),
}).superRefine((value, ctx) => {
  if (toCents(value.paidAmount) > toCents(value.amount)) ctx.addIssue({ code: "custom", message: "Оплата перевищує суму запису" });
  if (value.isPlanned && (value.hours !== 0 || value.amount !== 0 || value.paidAmount !== 0 || value.assignments.length !== 0)) ctx.addIssue({ code: "custom", message: "Запланований запис не може мати відпрацьованих годин чи оплати" });
  if (!value.isPlanned && (value.hours <= 0 || value.amount <= 0)) ctx.addIssue({ code: "custom", message: "Введіть години та суму роботи" });
  if (!validateSplit(value.amount, value.assignments).valid) ctx.addIssue({ code: "custom", message: "Частки працівниць мають дорівнювати сумі запису" });
  if (value.assignments.length && Math.abs(value.assignments.reduce((n, a) => n + a.hours, 0) - value.hours) > 0.02) ctx.addIssue({ code: "custom", message: "Години працівниць мають дорівнювати годинам запису" });
});
export const validateEntry = (input: NewWorkEntry): NewWorkEntry => {
  const value = entry.parse(input);
  return { ...value, status: resolveStatus(value.paidAmount, value.amount) } as NewWorkEntry;
};
export const validatePatch = (patch: WorkDayPatch): WorkDayPatch => z.object({
  date: z.string().refine(isISODate).optional(), hours: hours.optional(), amount: money.optional(),
  note: z.string().max(10_000).nullable().optional(), isPlanned: z.boolean().optional(),
}).strict().parse(patch);
