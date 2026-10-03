import { z } from "zod";
import { resolveStatus } from "@/domain/money";
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
  hours: z.number().finite().nonnegative().nullish(),
  amount: z.number().finite().nonnegative().nullish(),
  deleted_worker_name: z.string().nullish(),
  worker: workerRow.nullish(),
});

const workDayRow = z.object({
  id: z.string(),
  date: z.string(),
  hours: z.number().finite().nonnegative().nullish(),
  amount: z.number().finite().nonnegative().nullish(),
  rate_snapshot: z.number().finite().positive().nullish(),
  payment_status: z.string().nullish(),
  day_paid_amount: z.number().finite().nonnegative().nullish(),
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
  hourly_rate: z.number().finite().nonnegative().nullish(),
});

export type ReportRow = z.infer<typeof reportRow>;

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
    hourlyRate: d.rate_snapshot ?? undefined,
    paidAmount: d.day_paid_amount ?? 0,
    status: resolveStatus(d.day_paid_amount ?? 0, d.amount ?? 0),
    isPlanned: d.is_planned ?? false,
    note: d.note ?? undefined,
    assignments: (d.work_day_assignments ?? []).map(mapAssignment).sort((a,b) => a.id.localeCompare(b.id)),
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

/** Flat day query is paginated by days, so no legacy report can hide older rows. */
export const mapWorkDayRow = (raw: unknown): WorkDay => {
  const value = z.object({ report: z.object({ id: z.string(), client_id: z.string(), client_name: z.string(), client: z.object({ name: z.string() }).nullish() }) }).passthrough().parse(raw);
  return mapReportRowToWorkDays({ ...value.report, client_name: value.report.client?.name ?? value.report.client_name, work_days: [value] })[0];
};
