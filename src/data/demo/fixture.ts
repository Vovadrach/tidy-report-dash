import { patchWorkDay } from "@/domain/workDay";
import { validateEntry, clientInput, workerInput } from "@/domain/validation";
import { applyPartialPayment, round2 } from "@/domain/money";
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

const paymentOperations = new Map<string, { dayId: string; amount: number }>();
const entryOperations = new Map<string, { dayId: string; payload: string }>();
const checkReferences = (entry: NewWorkEntry) => {
  if (!clients.some(client => client.id === entry.clientId) || entry.assignments.some(a => !workers.some(worker => worker.id === a.workerId))) throw new Error('Клієнта або працівницю не знайдено');
};

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

  async createWorkEntry(input: NewWorkEntry) {
    await delay();
    const entry = validateEntry(input);
    checkReferences(entry);
    const id = entry.requestId ?? nid();
    const payload = JSON.stringify({ ...entry,clientName: undefined });
    const operation = entryOperations.get(id);
    if (operation && operation.payload !== payload) throw new Error('Повторна операція має інші дані');
    const existing = workDays.find(day => day.id === id);
    if (existing) return existing;
    workDays.push({
      id,
      reportId: `rep-${id}`,
      clientId: entry.clientId,
      clientName: entry.clientName,
      date: entry.date,
      hours: entry.hours,
      amount: entry.amount,
      hourlyRate: entry.hourlyRate,
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
    entryOperations.set(id,{ dayId: id,payload });
    return workDays.find(day => day.id === id)!;
  },

  async updateWorkDayFields(dayId, patch) {
    await delay();
    const current = workDays.find(day => day.id === dayId);
    if (!current) throw new Error('Запис не знайдено');
    const updated = patchWorkDay(current,patch);
    workDays = workDays.map(day => day.id === dayId ? updated : day);
    return updated;
  },

  async setPayment(dayId, payment) {
    await delay();
    const current = workDays.find(day => day.id === dayId);
    if (!current || current.isPlanned) throw new Error('Робочий запис не знайдено');
    const paidAmount = payment.status === 'paid' ? current.amount : payment.status === 'unpaid' ? 0 : round2(payment.paidAmount);
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > current.amount) throw new Error('Некоректна оплата');
    workDays = workDays.map((w) =>
      w.id === dayId ? { ...w, status: resolveStatus(paidAmount,w.amount), paidAmount } : w,
    );
    return workDays.find(day => day.id === dayId)!;
  },

  async saveWorkEntry(dayId,input) {
    await delay();
    const entry = validateEntry(input);
    checkReferences(entry);
    const payload = JSON.stringify({ ...entry,clientName: undefined });
    const operation = entry.requestId ? entryOperations.get(entry.requestId) : undefined;
    if (operation) {
      if (operation.dayId !== dayId || operation.payload !== payload) throw new Error('Повторна операція має інші дані');
      return workDays.find(day => day.id === dayId)!;
    }
    const current = workDays.find(day => day.id === dayId);
    if (!current) throw new Error('Запис не знайдено');
    if (!current.isPlanned || current.clientId !== entry.clientId) throw new Error('Роботу вже виконано або клієнта змінено');
    const updated = { ...current,date: entry.date,hours: entry.hours,amount: entry.amount,hourlyRate: entry.hourlyRate,paidAmount: entry.paidAmount,
      status: resolveStatus(entry.paidAmount,entry.amount),isPlanned: entry.isPlanned,note: entry.note,
      assignments: entry.assignments.map((a,i) => { const w = workers.find(w => w.id === a.workerId); return {
        ...a,id: `${dayId}-a${i}`,workerName: w?.name ?? '?',workerColor: w?.color ?? '#9ca3af',
      }; }),
    };
    workDays = workDays.map(day => day.id === dayId ? updated : day);
    if (entry.requestId) entryOperations.set(entry.requestId,{ dayId,payload });
    return updated;
  },
  async addPayment(dayId,amount,operationId) {
    await delay();
    const operation = paymentOperations.get(operationId);
    if (operation) {
      if (operation.dayId !== dayId || operation.amount !== round2(amount)) throw new Error('Повторна операція має інші дані');
      return workDays.find(day => day.id === dayId)!;
    }
    const current = workDays.find(day => day.id === dayId);
    if (!current || current.isPlanned) throw new Error('Робочий запис не знайдено');
    const result = applyPartialPayment(current,amount);
    if (!result.ok) throw new Error('Некоректна оплата');
    const updated = { ...current,paidAmount: result.paidAmount,status: result.status };
    workDays = workDays.map(day => day.id === dayId ? updated : day);
    paymentOperations.set(operationId,{ dayId,amount: round2(amount) });
    return updated;
  },
  async markAllPaid(days) {
    await delay();
    const updated = days.map(({ id }) => {
      const day = workDays.find(row => row.id === id);
      if (!day || day.isPlanned) throw new Error('Робочий запис не знайдено');
      return { ...day,paidAmount: day.amount,status: 'paid' as const };
    });
    const rows = new Map(updated.map(day => [day.id,day]));
    workDays = workDays.map(day => rows.get(day.id) ?? day);
    return updated;
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
    return workDays.find(day => day.id === dayId)!;
  },

  async deleteWorkDay(dayId) {
    await delay();
    workDays = workDays.filter((w) => w.id !== dayId);
  },


  async addClient(input) {
    input = clientInput.parse(input);
    await delay();
    clients.unshift({ id: nid(), name: input.name, hourlyRate: input.hourlyRate });
  },
  async updateClient(id, input) {
    input = clientInput.parse(input);
    await delay();
    workDays = workDays.map(day => day.clientId === id ? { ...day,clientName: input.name } : day);
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
    input = workerInput.parse(input);
    await delay();
    const w: Worker = { id: nid(), ...input, isPrimary: !workers.some(worker => worker.isPrimary) };
    workers.push(w);
    return w;
  },
  async deleteWorker(id) {
    await delay();
    const i = workers.findIndex((x) => x.id === id);
    if (i >= 0) {
      const [worker] = workers.splice(i,1);
      workDays = workDays.map(day => ({ ...day,assignments: day.assignments.map(a => a.workerId === id ? { ...a,workerId: null,workerName: worker.name } : a) }));
    }
  },
};

export const demoToday = todayLocal();
