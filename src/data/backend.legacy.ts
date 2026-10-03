import { supabase } from "@/lib/supabase";
import type { NewAssignment, NewWorkEntry, PaymentStatus, WorkDayPatch, Worker } from "@/domain/types";
import { mapWorker } from "./mappers";

/** Compatibility writes until the atomic SQL migration is installed. */
const uid = async (): Promise<string> => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = session?.user;
  if (!user) throw new Error("Not authenticated");
  return user.id;
};

export const legacyBackend = {
  async createWorkEntry(entry: NewWorkEntry) {
    const userId = await uid();
    // Стара схема: запис живе всередині report-обгортки (1 report = 1 день)
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert([{
        id: entry.requestId,
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
        id: entry.requestId,
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

  async updateWorkDayFields(dayId: string, patch: WorkDayPatch) {
    const update: Record<string, unknown> = {};
    if (patch.date !== undefined) update.date = patch.date;
    if (patch.hours !== undefined) update.hours = patch.hours;
    if (patch.amount !== undefined) update.amount = patch.amount;
    if (patch.note !== undefined) update.note = patch.note;
    if (patch.isPlanned !== undefined) update.is_planned = patch.isPlanned;
    const { error } = await supabase.from("work_days").update(update).eq("id", dayId);
    if (error) throw error;
  },

  async setPayment(dayId: string, payment: { status: PaymentStatus; paidAmount: number }) {
    const { error } = await supabase
      .from("work_days")
      .update({ payment_status: payment.status, day_paid_amount: payment.paidAmount })
      .eq("id", dayId);
    if (error) throw error;
  },

  async replaceAssignments(dayId: string, assignments: NewAssignment[]) {
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

  async deleteWorkDay(dayId: string) {
    const { error } = await supabase.from("work_days").delete().eq("id", dayId);
    if (error) throw error;
  },

  async deleteReport(reportId: string) {
    const { error } = await supabase.from("reports").delete().eq("id", reportId);
    if (error) throw error;
  },

  async addClient(input: { name: string; hourlyRate: number }) {
    const userId = await uid();
    const { error } = await supabase
      .from("clients")
      .insert([{ user_id: userId, name: input.name, hourly_rate: input.hourlyRate }]);
    if (error) throw error;
  },

  async updateClient(id: string, input: { name: string; hourlyRate: number }) {
    const { error } = await supabase
      .from("clients")
      .update({ name: input.name, hourly_rate: input.hourlyRate })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteClient(id: string) {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
  },

  async addWorker(input: Omit<Worker, "id">) {
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

  async deleteWorker(id: string) {
    const { error } = await supabase.from("workers").delete().eq("id", id);
    if (error) throw error;
  },
};
