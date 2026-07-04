import { supabase } from "@/lib/supabase";
import type { NewWorkEntry } from "@/domain/types";
import type { Backend } from "./backend";
import { mapClient, mapReportRowToWorkDays, mapWorker } from "./mappers";

/**
 * Прод-бекенд проти СТАРОЇ схеми (reports → work_days → assignments).
 * Читання — ОДИН вкладений запит PostgREST замість 1 + R + R×D.
 *
 * Після застосування supabase/migrations (v3) цей файл переходить на
 * work_days_v3 + в'ю (див. src/data/README.md) — контракт Backend
 * не змінюється, сторінки не торкаються.
 */

const uid = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
};

export const supabaseBackend: Backend = {
  async fetchWorkDays() {
    const userId = await uid();
    const { data, error } = await supabase
      .from("reports")
      .select(`
        id, client_id, client_name,
        work_days (
          id, date, hours, amount, payment_status, day_paid_amount, is_planned, note,
          work_day_assignments (
            id, worker_id, hours, amount, deleted_worker_name,
            worker:workers ( id, name, color, is_primary )
          )
        )
      `)
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? [])
      .flatMap(mapReportRowToWorkDays)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  },

  async fetchClients() {
    const userId = await uid();
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, hourly_rate")
      .eq("user_id", userId)
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
    // Стара схема: запис живе всередині report-обгортки (1 report = 1 день)
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert([{
        user_id: userId,
        client_id: entry.clientId,
        client_name: entry.clientName,
        date: entry.date,
        status: "in_progress",
        payment_status: entry.status,
        total_hours: entry.hours,
        total_earned: entry.amount,
        paid_amount: entry.paidAmount,
        remaining_amount: entry.amount - entry.paidAmount,
      }])
      .select("id")
      .single();
    if (reportError) throw reportError;

    const { data: day, error: dayError } = await supabase
      .from("work_days")
      .insert([{
        report_id: report.id,
        date: entry.date,
        hours: entry.hours,
        amount: entry.amount,
        payment_status: entry.status,
        day_paid_amount: entry.paidAmount,
        is_planned: entry.isPlanned,
        note: entry.note ?? null,
      }])
      .select("id")
      .single();
    if (dayError) throw dayError;

    if (entry.assignments.length > 0) {
      const { error } = await supabase.from("work_day_assignments").insert(
        entry.assignments.map((a) => ({
          work_day_id: day.id,
          worker_id: a.workerId,
          hours: a.hours,
          amount: a.amount,
        })),
      );
      if (error) throw error;
    }
  },

  async updateWorkDayFields(dayId, patch) {
    const update: Record<string, unknown> = {};
    if (patch.date !== undefined) update.date = patch.date;
    if (patch.hours !== undefined) update.hours = patch.hours;
    if (patch.amount !== undefined) update.amount = patch.amount;
    if (patch.note !== undefined) update.note = patch.note;
    if (patch.isPlanned !== undefined) update.is_planned = patch.isPlanned;
    const { error } = await supabase.from("work_days").update(update).eq("id", dayId);
    if (error) throw error;
  },

  async setPayment(dayId, payment) {
    const { error } = await supabase
      .from("work_days")
      .update({ payment_status: payment.status, day_paid_amount: payment.paidAmount })
      .eq("id", dayId);
    if (error) throw error;
  },

  async replaceAssignments(dayId, assignments) {
    const { error: delError } = await supabase
      .from("work_day_assignments")
      .delete()
      .eq("work_day_id", dayId);
    if (delError) throw delError;
    if (assignments.length > 0) {
      const { error } = await supabase.from("work_day_assignments").insert(
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
    const { error } = await supabase.from("work_days").delete().eq("id", dayId);
    if (error) throw error;
  },

  async deleteReport(reportId) {
    const { error } = await supabase.from("reports").delete().eq("id", reportId);
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
