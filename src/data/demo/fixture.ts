import { resolveStatus } from "@/domain/money";
import type { Client, NewWorkEntry, WorkDay, Worker } from "@/domain/types";
import { toISODate, todayLocal } from "@/domain/dates";
import type { Backend } from "../backend";

/**
 * Demo-бекенд (VITE_DEMO=1): in-memory дані для розробки, скриншотів
 * і smoke-тестів. Мутації працюють по-справжньому (в межах сесії).
 */

const workers: Worker[] = [
  { id: "w1", name: "Лідія", color: "#4f8f83", isPrimary: true },
  { id: "w2", name: "Оксана", color: "#8f6f4f", isPrimary: false },
];

const clients: Client[] = [
  { id: "c1", name: "Марко Россі", hourlyRate: 12 },
  { id: "c2", name: "Джулія Б'янкі", hourlyRate: 14 },
  { id: "c3", name: "Апартаменти Верона", hourlyRate: 13 },
];

let seq = 100;
const nid = () => `demo-${seq++}`;

const day = (
  over: Partial<WorkDay> & Pick<WorkDay, "clientId" | "date">,
): WorkDay => {
  const client = clients.find((c) => c.id === over.clientId)!;
  const amount = over.amount ?? (over.hours ?? 0) * client.hourlyRate;
  const paidAmount = over.paidAmount ?? 0;
  const id = over.id ?? nid();
  return {
    id,
    reportId: `rep-${id}`,
    clientName: client.name,
    hours: 0,
    status: resolveStatus(paidAmount, amount),
    isPlanned: false,
    assignments: over.assignments ?? [{
      id: `${id}-a1`,
      workerId: "w1",
      workerName: "Лідія",
      workerColor: "#4f8f83",
      hours: over.hours ?? 0,
      amount,
    }],
    ...over,
    amount,
    paidAmount,
  };
};

const now = new Date();
const d = (offset: number) =>
  toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
const prevMonth = (dayOfMonth: number, monthsBack: number) =>
  toISODate(new Date(now.getFullYear(), now.getMonth() - monthsBack, dayOfMonth));

let workDays: WorkDay[] = [
  day({ clientId: "c2", date: d(2), isPlanned: true, note: "Запланована зміна", assignments: [] }),
  day({
    clientId: "c1", date: d(0), hours: 4,
    assignments: [
      { id: "x1", workerId: "w1", workerName: "Лідія", workerColor: "#4f8f83", hours: 2, amount: 24 },
      { id: "x2", workerId: "w2", workerName: "Оксана", workerColor: "#8f6f4f", hours: 2, amount: 24 },
    ],
  }),
  day({ clientId: "c2", date: d(-1), hours: 5 }),
  day({ clientId: "c1", date: d(-2), hours: 4.5, paidAmount: 24, note: "Генеральне прибирання" }),
  day({ clientId: "c1", date: d(-3), hours: 3, paidAmount: 36 }),
  day({ clientId: "c3", date: d(-4), hours: 2, paidAmount: 26 }),
  // Історія для графіка (5 попередніх місяців)
  ...[1, 2, 3, 4, 5].flatMap((m) => [
    day({ clientId: "c1", date: prevMonth(6, m), hours: 3 + m, paidAmount: (3 + m) * 12 }),
    day({ clientId: "c2", date: prevMonth(16, m), hours: 4, paidAmount: m % 2 ? 56 : 20 }),
  ]),
];

const delay = () => new Promise((r) => setTimeout(r, 120));

export const demoBackend: Backend = {
  async fetchWorkDays() {
    await delay();
    return [...workDays].sort((a, b) => (a.date < b.date ? 1 : -1));
  },
  async fetchClients() {
    await delay();
    return [...clients];
  },
  async fetchWorkers() {
    await delay();
    return [...workers];
  },

  async createWorkEntry(entry: NewWorkEntry) {
    await delay();
    const id = nid();
    workDays.push({
      id,
      reportId: `rep-${id}`,
      clientId: entry.clientId,
      clientName: entry.clientName,
      date: entry.date,
      hours: entry.hours,
      amount: entry.amount,
      paidAmount: entry.paidAmount,
      status: resolveStatus(entry.paidAmount, entry.amount),
      isPlanned: entry.isPlanned,
      note: entry.note,
      assignments: entry.assignments.map((a, i) => {
        const w = workers.find((x) => x.id === a.workerId);
        return {
          id: `${id}-a${i}`,
          workerId: a.workerId,
          workerName: w?.name ?? "?",
          workerColor: w?.color ?? "#9ca3af",
          hours: a.hours,
          amount: a.amount,
        };
      }),
    });
  },

  async updateWorkDayFields(dayId, patch) {
    await delay();
    workDays = workDays.map((w) =>
      w.id === dayId
        ? {
            ...w,
            date: patch.date ?? w.date,
            hours: patch.hours ?? w.hours,
            amount: patch.amount ?? w.amount,
            note: patch.note === undefined ? w.note : patch.note ?? undefined,
            isPlanned: patch.isPlanned ?? w.isPlanned,
          }
        : w,
    );
  },

  async setPayment(dayId, payment) {
    await delay();
    workDays = workDays.map((w) =>
      w.id === dayId ? { ...w, status: payment.status, paidAmount: payment.paidAmount } : w,
    );
  },

  async replaceAssignments(dayId, assignments) {
    await delay();
    workDays = workDays.map((w) =>
      w.id === dayId
        ? {
            ...w,
            assignments: assignments.map((a, i) => {
              const worker = workers.find((x) => x.id === a.workerId);
              return {
                id: `${dayId}-a${i}`,
                workerId: a.workerId,
                workerName: worker?.name ?? "?",
                workerColor: worker?.color ?? "#9ca3af",
                hours: a.hours,
                amount: a.amount,
              };
            }),
          }
        : w,
    );
  },

  async deleteWorkDay(dayId) {
    await delay();
    workDays = workDays.filter((w) => w.id !== dayId);
  },

  async deleteReport(reportId) {
    await delay();
    workDays = workDays.filter((w) => w.reportId !== reportId);
  },

  async addClient(input) {
    await delay();
    clients.unshift({ id: nid(), name: input.name, hourlyRate: input.hourlyRate });
  },
  async updateClient(id, input) {
    await delay();
    const c = clients.find((x) => x.id === id);
    if (c) {
      c.name = input.name;
      c.hourlyRate = input.hourlyRate;
    }
  },
  async deleteClient(id) {
    await delay();
    const i = clients.findIndex((x) => x.id === id);
    if (i >= 0) clients.splice(i, 1);
    workDays = workDays.filter((w) => w.clientId !== id);
  },

  async addWorker(input) {
    await delay();
    const w: Worker = { id: nid(), ...input };
    workers.push(w);
    return w;
  },
  async deleteWorker(id) {
    await delay();
    const i = workers.findIndex((x) => x.id === id);
    if (i >= 0) workers.splice(i, 1);
  },
};

export const demoToday = todayLocal();
