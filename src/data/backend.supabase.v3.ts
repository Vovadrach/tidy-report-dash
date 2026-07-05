import { z } from "zod";
import { supabase } from "@/lib/supabase";
import type { Assignment, NewWorkEntry, WorkDay } from "@/domain/types";
import type { Backend } from "./backend";
import { mapClient, mapWorker } from "./mappers";

/**
 * Прод-бекенд проти СХЕМИ v3 (work_days_v3 + assignments_v3, без обгортки
 * reports). Вмикається `VITE_V3=1` ПІСЛЯ застосування supabase/migrations
 * 0001–0003 (див. supabase/README.md). Контракт Backend незмінний; сторінки
 * не торкаються. reportId мапиться на id дня — тому useDeleteReport працює далі.
 */

const uid = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
};

const workerRow = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullish(),
  is_primary: z.boolean().nullish(),
});

const assignmentV3Row = z.object({
  id: z.string(),
  worker_id: z.string().nullable(),
  hours: z.number().nullish(),
  amount: z.number().nullish(),
  deleted_worker_name: z.string().nullish(),
  worker: workerRow.nullish(),
});

const workDayV3Row = z.object({
  id: z.string(),
  client_id: z.string(),
  date: z.string(),
  hours: z.number().nullish(),
  amount: z.number().nullish(),
  payment_status: z.string().nullish(),
  paid_amount: z.number().nullish(),
  is_planned: z.boolean().nullish(),
  note: z.string().nullish(),
  client: z.object({ name: z.string().nullish() }).nullish(),
  work_day_assignments_v3: z.array(assignmentV3Row).nullish(),
});

const toStatus = (s: string | null | undefined): WorkDay["status"] =>
  s === "paid" || s === "partial" ? s : "unpaid";

const mapAssignment = (row: z.infer<typeof assignmentV3Row>): Assignment => ({
  id: row.id,
  workerId: row.worker_id,
  workerName: row.worker?.name ?? row.deleted_worker_name ?? "Видалена працівниця",
  workerColor: row.worker?.color ?? "#9ca3af",
  hours: row.hours ?? 0,
  amount: row.amount ?? 0,
});

const mapWorkDay = (raw: unknown): WorkDay => {
  const d = workDayV3Row.parse(raw);
  return {
    id: d.id,
    reportId: d.id, // v3: одиниця = день; reportId=id зберігає сумісність useDeleteReport
    clientId: d.client_id,
    clientName: d.client?.name ?? "Без імені",
    date: d.date.slice(0, 10),
    hours: d.hours ?? 0,
    amount: d.amount ?? 0,
    paidAmount: d.paid_amount ?? 0,
    status: toStatus(d.payment_status),
    isPlanned: d.is_planned ?? false,
    note: d.note ?? undefined,
    assignments: (d.work_day_assignments_v3 ?? []).map(mapAssignment),
  };
};

export const supabaseBackendV3: Backend = {
  async fetchWorkDays() {
    const userId = await uid();
    const { data, error } = await supabase
      .from("work_days_v3")
      .select(`
        id, client_id, date, hours, amount, payment_status, paid_amount, is_planned, note,
        client:clients ( name ),
        work_day_assignments_v3 (
          id, worker_id, hours, amount, deleted_worker_name,
          worker:workers ( id, name, color, is_primary )
        )
      `)
      .eq("user_id", userId)
      .order("date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapWorkDay);
  },

  async fetchClients() {
    const userId = await uid();
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, hourly_rate")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapClient);
  },

  async fetchWorkers() {
    const userId = await uid();
    const { data, error } = await supabase
      .from("workers")
      .select("id, name, color, is_primary")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapWorker);
  },

  async createWorkEntry(entry: NewWorkEntry) {
    const userId = await uid();
    const { data: day, error } = await supabase
      .from("work_days_v3")
      .insert([{
        user_id: userId,
        client_id: entry.clientId,
        date: entry.date,
        hours: entry.hours,
        amount: entry.amount,
        payment_status: entry.status,
        paid_amount: entry.paidAmount,
        is_planned: entry.isPlanned,
        note: entry.note ?? null,
      }])
      .select("id")
      .single();
    if (error) throw error;

    if (entry.assignments.length > 0) {
      const { error: aErr } = await supabase.from("work_day_assignments_v3").insert(
        entry.assignments.map((a) => ({
          work_day_id: day.id,
          worker_id: a.workerId,
          hours: a.hours,
          amount: a.amount,
        })),
      );
      if (aErr) throw aErr;
    }
  },

  async updateWorkDayFields(dayId, patch) {
    const update: Record<string, unknown> = {};
    if (patch.date !== undefined) update.date = patch.date;
    if (patch.hours !== undefined) update.hours = patch.hours;
    if (patch.amount !== undefined) update.amount = patch.amount;
    if (patch.note !== undefined) update.note = patch.note;
    if (patch.isPlanned !== undefined) update.is_planned = patch.isPlanned;
    const { error } = await supabase.from("work_days_v3").update(update).eq("id", dayId);
    if (error) throw error;
  },

  async setPayment(dayId, payment) {
    const { error } = await supabase
      .from("work_days_v3")
      .update({ payment_status: payment.status, paid_amount: payment.paidAmount })
      .eq("id", dayId);
    if (error) throw error;
  },

  async replaceAssignments(dayId, assignments) {
    const { error: delErr } = await supabase
      .from("work_day_assignments_v3")
      .delete()
      .eq("work_day_id", dayId);
    if (delErr) throw delErr;
    if (assignments.length > 0) {
      const { error } = await supabase.from("work_day_assignments_v3").insert(
        assignments.map((a) => ({
          work_day_id: dayId,
          worker_id: a.workerId,
          hours: a.hours,
          amount: a.amount,
        })),
      );
      if (error) throw error;
    }
  },

  async deleteWorkDay(dayId) {
    const { error } = await supabase.from("work_days_v3").delete().eq("id", dayId);
    if (error) throw error;
  },

  // v3: одиниця обліку — день; reportId=id, тож видалення однакове
  async deleteReport(reportId) {
    const { error } = await supabase.from("work_days_v3").delete().eq("id", reportId);
    if (error) throw error;
  },

  async addClient(input) {
    const userId = await uid();
    const { error } = await supabase
      .from("clients")
      .insert([{ user_id: userId, name: input.name, hourly_rate: input.hourlyRate }]);
    if (error) throw error;
  },

  async updateClient(id, input) {
    const { error } = await supabase
      .from("clients")
      .update({ name: input.name, hourly_rate: input.hourlyRate })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteClient(id) {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
  },

  async addWorker(input) {
    const userId = await uid();
    const { data, error } = await supabase
      .from("workers")
      .insert([{
        user_id: userId,
        name: input.name,
        color: input.color,
        is_primary: input.isPrimary,
      }])
      .select("id, name, color, is_primary")
      .single();
    if (error) throw error;
    return mapWorker(data);
  },

  async deleteWorker(id) {
    const { error } = await supabase.from("workers").delete().eq("id", id);
    if (error) throw error;
  },
};
