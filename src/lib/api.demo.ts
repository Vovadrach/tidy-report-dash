import { backend } from "@/data";
import { resolveStatus } from "@/domain/money";
import type { WorkDay as DomainWorkDay } from "@/domain/types";
import type {
  Client,
  Report,
  Worker,
  WorkDay,
  WorkDayAssignment,
  PaymentStatus,
} from "@/types/report";

/**
 * DEMO-фасад над чистим `backend` (VITE_DEMO=1): reshape плоских domain-WorkDay
 * у Report[]/WorkDay/Worker оригінальної форми — для скриншотів і smoke.
 * Прод використовує realApi (api.real.ts). Архітектура даних — наш backend.
 */

const toAssignment = (a: DomainWorkDay["assignments"][number], dayId: string): WorkDayAssignment => ({
  id: a.id,
  work_day_id: dayId,
  workDayId: dayId,
  worker_id: a.workerId,
  workerId: a.workerId,
  amount: a.amount,
  hours: a.hours,
  worker: a.workerId
    ? { id: a.workerId, user_id: "demo", name: a.workerName, color: a.workerColor, is_primary: false, isPrimary: false }
    : null,
  deleted_worker_name: a.workerId ? null : a.workerName,
});

const toWorkDay = (d: DomainWorkDay): WorkDay => ({
  id: d.id,
  date: d.date,
  hours: d.hours,
  amount: d.amount,
  payment_status: d.status,
  paymentStatus: d.status,
  note: d.note,
  day_paid_amount: d.paidAmount,
  is_planned: d.isPlanned,
  assignments: d.assignments.map((a) => toAssignment(a, d.id)),
});

const toReports = (days: DomainWorkDay[]): Report[] => {
  const groups = new Map<string, DomainWorkDay[]>();
  for (const d of days) {
    const arr = groups.get(d.reportId) ?? [];
    arr.push(d);
    groups.set(d.reportId, arr);
  }
  return [...groups.values()].map((grp) => {
    const first = grp[0];
    const totalHours = grp.reduce((s, d) => s + d.hours, 0);
    const totalEarned = grp.reduce((s, d) => s + d.amount, 0);
    const paidAmount = grp.reduce((s, d) => s + d.paidAmount, 0);
    return {
      id: first.reportId,
      clientId: first.clientId,
      client_id: first.clientId,
      clientName: first.clientName,
      client_name: first.clientName,
      date: first.date,
      status: "completed",
      paymentStatus: resolveStatus(paidAmount, totalEarned),
      payment_status: resolveStatus(paidAmount, totalEarned),
      totalHours,
      total_hours: totalHours,
      totalEarned,
      total_earned: totalEarned,
      paidAmount,
      paid_amount: paidAmount,
      remainingAmount: totalEarned - paidAmount,
      remaining_amount: totalEarned - paidAmount,
      workDays: grp.map(toWorkDay),
    };
  });
};

const toClient = (c: { id: string; name: string; hourlyRate: number }): Client => ({
  id: c.id,
  name: c.name,
  hourly_rate: c.hourlyRate,
  hourlyRate: c.hourlyRate,
});

const toWorker = (w: { id: string; name: string; color: string; isPrimary: boolean }): Worker => ({
  id: w.id,
  user_id: "demo",
  name: w.name,
  color: w.color,
  is_primary: w.isPrimary,
  isPrimary: w.isPrimary,
});

const findDay = async (dayId: string): Promise<DomainWorkDay | undefined> =>
  (await backend.fetchWorkDays()).find((d) => d.id === dayId);

export const demoApi = {
  getClients: async (): Promise<Client[]> => (await backend.fetchClients()).map(toClient),

  addClient: async (client: Omit<Client, "id">): Promise<Client> => {
    const hourlyRate = client.hourly_rate ?? client.hourlyRate ?? 0;
    await backend.addClient({ name: client.name, hourlyRate });
    return { id: `demo-${Date.now()}`, name: client.name, hourly_rate: hourlyRate, hourlyRate };
  },

  updateClient: async (clientId: string, updates: Partial<Client>): Promise<Client> => {
    const hourlyRate = updates.hourly_rate ?? updates.hourlyRate ?? 0;
    await backend.updateClient(clientId, { name: updates.name ?? "", hourlyRate });
    return { id: clientId, name: updates.name ?? "", hourly_rate: hourlyRate, hourlyRate };
  },

  deleteClient: async (clientId: string): Promise<void> => backend.deleteClient(clientId),

  getReports: async (): Promise<Report[]> => toReports(await backend.fetchWorkDays()),

  addReport: async (report: Omit<Report, "id">): Promise<Report> => {
    const day = report.workDays?.[0];
    await backend.createWorkEntry({
      clientId: report.clientId || report.client_id || "",
      clientName: report.clientName || report.client_name || "",
      date: report.date,
      hours: day?.hours ?? report.totalHours ?? 0,
      amount: day?.amount ?? report.totalEarned ?? 0,
      status: (day?.paymentStatus || day?.payment_status || report.paymentStatus || "unpaid") as PaymentStatus,
      paidAmount: day?.day_paid_amount ?? report.paidAmount ?? 0,
      isPlanned: day?.is_planned ?? false,
      note: day?.note ?? undefined,
      assignments: [],
    });
    return { id: `demo-${Date.now()}`, ...(report as object) } as Report;
  },

  updateReport: async (_reportId: string, updates: Partial<Report>): Promise<Report> => {
    for (const d of updates.workDays ?? []) await demoApi.updateWorkDay(d.id, d);
    return { id: _reportId, ...(updates as object) } as Report;
  },

  deleteReport: async (reportId: string): Promise<void> => backend.deleteReport(reportId),

  getWorkDay: async (_reportId: string, dayId: string): Promise<WorkDay | null> => {
    const d = await findDay(dayId);
    return d ? toWorkDay(d) : null;
  },

  updateWorkDay: async (dayId: string, updates: Partial<WorkDay>): Promise<WorkDay> => {
    await backend.updateWorkDayFields(dayId, {
      date: updates.date,
      hours: updates.hours,
      amount: updates.amount,
      note: updates.note === undefined ? undefined : updates.note ?? null,
      isPlanned: updates.is_planned,
    });
    const status = updates.payment_status ?? updates.paymentStatus;
    if (status !== undefined || updates.day_paid_amount !== undefined) {
      const d = await findDay(dayId);
      const amount = updates.amount ?? d?.amount ?? 0;
      const paid = updates.day_paid_amount ?? d?.paidAmount ?? 0;
      await backend.setPayment(dayId, { status: (status ?? resolveStatus(paid, amount)) as PaymentStatus, paidAmount: paid });
    }
    const d = await findDay(dayId);
    return d ? toWorkDay(d) : ({ id: dayId, ...updates } as WorkDay);
  },

  deleteWorkDay: async (dayId: string): Promise<void> => backend.deleteWorkDay(dayId),

  getDayPaidAmount: async (dayId: string): Promise<number> => (await findDay(dayId))?.paidAmount ?? 0,

  setDayPaidAmount: async (dayId: string, amount: number): Promise<void> => {
    const d = await findDay(dayId);
    await backend.setPayment(dayId, { status: resolveStatus(amount, d?.amount ?? 0), paidAmount: amount });
  },

  getWorkers: async (): Promise<Worker[]> => (await backend.fetchWorkers()).map(toWorker),

  addWorker: async (worker: Omit<Worker, "id" | "user_id" | "created_at">): Promise<Worker> => {
    const w = await backend.addWorker({
      name: worker.name,
      color: worker.color,
      isPrimary: worker.is_primary ?? worker.isPrimary ?? false,
    });
    return toWorker(w);
  },

  updateWorker: async (workerId: string, updates: Partial<Worker>): Promise<Worker> =>
    ({ id: workerId, user_id: "demo", name: updates.name ?? "", color: updates.color ?? "#9ca3af", is_primary: updates.is_primary ?? false, isPrimary: updates.is_primary ?? false }),

  deleteWorker: async (workerId: string): Promise<void> => backend.deleteWorker(workerId),

  ensurePrimaryWorker: async (name = "Лідія"): Promise<Worker> => {
    const workers = await backend.fetchWorkers();
    const primary = workers.find((w) => w.isPrimary) ?? workers[0];
    return primary ? toWorker(primary) : { id: "demo-primary", user_id: "demo", name, color: "#4f8f83", is_primary: true, isPrimary: true };
  },

  removeDuplicateWorkers: async (): Promise<{ success: boolean; message: string }> =>
    ({ success: true, message: "demo" }),

  getWorkDayAssignments: async (workDayId: string): Promise<WorkDayAssignment[]> => {
    const d = await findDay(workDayId);
    return d ? d.assignments.map((a) => toAssignment(a, d.id)) : [];
  },

  addWorkDayAssignment: async (assignment: Omit<WorkDayAssignment, "id" | "created_at">): Promise<WorkDayAssignment> => {
    const dayId = assignment.work_day_id || assignment.workDayId || "";
    const d = await findDay(dayId);
    const existing = (d?.assignments ?? []).map((a) => ({ workerId: a.workerId ?? "", hours: a.hours, amount: a.amount }));
    await backend.replaceAssignments(dayId, [
      ...existing,
      { workerId: assignment.worker_id ?? assignment.workerId ?? "", hours: assignment.hours, amount: assignment.amount },
    ]);
    return { id: `demo-a-${Date.now()}`, ...assignment } as WorkDayAssignment;
  },

  updateWorkDayAssignment: async (assignmentId: string, updates: Partial<WorkDayAssignment>): Promise<WorkDayAssignment> =>
    ({ id: assignmentId, ...updates } as WorkDayAssignment),

  deleteWorkDayAssignment: async (): Promise<void> => {},

  deleteWorkDayAssignmentsByWorkDay: async (workDayId: string): Promise<void> =>
    backend.replaceAssignments(workDayId, []),
};
