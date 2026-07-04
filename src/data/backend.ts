import type {
  Client, NewAssignment, NewWorkEntry, PaymentStatus, WorkDay, Worker,
} from "@/domain/types";

/**
 * Контракт бекенда. Дві реалізації:
 *  - backend.supabase.ts — прод (стара схема, один вкладений запит);
 *  - demo/fixture.ts — VITE_DEMO=1, in-memory (розробка/скриншоти/smoke).
 */
export interface Backend {
  fetchWorkDays(): Promise<WorkDay[]>;
  fetchClients(): Promise<Client[]>;
  fetchWorkers(): Promise<Worker[]>;

  createWorkEntry(entry: NewWorkEntry): Promise<void>;
  updateWorkDayFields(
    dayId: string,
    patch: { date?: string; hours?: number; amount?: number; note?: string | null; isPlanned?: boolean },
  ): Promise<void>;
  setPayment(dayId: string, payment: { status: PaymentStatus; paidAmount: number }): Promise<void>;
  replaceAssignments(dayId: string, assignments: NewAssignment[]): Promise<void>;
  deleteWorkDay(dayId: string): Promise<void>;
  /** Перехідне (стара схема): видалення запису = видалення report-обгортки */
  deleteReport(reportId: string): Promise<void>;

  addClient(input: { name: string; hourlyRate: number }): Promise<void>;
  updateClient(id: string, input: { name: string; hourlyRate: number }): Promise<void>;
  deleteClient(id: string): Promise<void>;

  addWorker(input: { name: string; color: string; isPrimary: boolean }): Promise<Worker>;
  deleteWorker(id: string): Promise<void>;
}
