import { z } from "zod";
import type { Assignment, Client, WorkDay, Worker } from "@/domain/types";

/**
 * Межа БД → домен. Єдине місце, де існує snake_case.
 * Zod валідує форму рядків (дешева страховка від дрейфу схеми).
 */

const workerRow = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullish(),
  is_primary: z.boolean().nullish(),
});

const assignmentRow = z.object({
  id: z.string(),
  worker_id: z.string().nullable(),
  hours: z.number().nullish(),
  amount: z.number().nullish(),
  deleted_worker_name: z.string().nullish(),
  worker: workerRow.nullish(),
});

const workDayRow = z.object({
  id: z.string(),
  date: z.string(),
  hours: z.number().nullish(),
  amount: z.number().nullish(),
  payment_status: z.string().nullish(),
  day_paid_amount: z.number().nullish(),
  is_planned: z.boolean().nullish(),
  note: z.string().nullish(),
  work_day_assignments: z.array(assignmentRow).nullish(),
});

export const reportRow = z.object({
  id: z.string(),
  client_id: z.string().nullish(),
  client_name: z.string().nullish(),
  work_days: z.array(workDayRow).nullish(),
});

const clientRow = z.object({
  id: z.string(),
  name: z.string(),
  hourly_rate: z.number().nullish(),
});

export type ReportRow = z.infer<typeof reportRow>;

const toStatus = (s: string | null | undefined): WorkDay["status"] =>
  s === "paid" || s === "partial" ? s : "unpaid";

const mapAssignment = (row: z.infer<typeof assignmentRow>): Assignment => ({
  id: row.id,
  workerId: row.worker_id,
  workerName: row.worker?.name ?? row.deleted_worker_name ?? "Видалена працівниця",
  workerColor: row.worker?.color ?? "#9ca3af",
  hours: row.hours ?? 0,
  amount: row.amount ?? 0,
});

export const mapReportRowToWorkDays = (raw: unknown): WorkDay[] => {
  const report = reportRow.parse(raw);
  return (report.work_days ?? []).map((d) => ({
    id: d.id,
    reportId: report.id,
    clientId: report.client_id ?? "",
    clientName: report.client_name ?? "Без імені",
    date: d.date.slice(0, 10),
    hours: d.hours ?? 0,
    amount: d.amount ?? 0,
    paidAmount: d.day_paid_amount ?? 0,
    status: toStatus(d.payment_status),
    isPlanned: d.is_planned ?? false,
    note: d.note ?? undefined,
    assignments: (d.work_day_assignments ?? []).map(mapAssignment),
  }));
};

export const mapClient = (raw: unknown): Client => {
  const row = clientRow.parse(raw);
  return { id: row.id, name: row.name, hourlyRate: row.hourly_rate ?? 0 };
};

export const mapWorker = (raw: unknown): Worker => {
  const row = workerRow.parse(raw);
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? "#9ca3af",
    isPrimary: row.is_primary ?? false,
  };
};
