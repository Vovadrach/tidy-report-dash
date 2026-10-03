import type { Client, NewAssignment, NewWorkEntry, PaymentStatus, WorkDay, WorkDayPatch, Worker } from '@/domain/types';

export interface Backend {
  fetchWorkDays(signal?: AbortSignal): Promise<WorkDay[]>;
  fetchClients(signal?: AbortSignal): Promise<Client[]>;
  fetchWorkers(signal?: AbortSignal): Promise<Worker[]>;
  createWorkEntry(entry: NewWorkEntry): Promise<WorkDay>;
  saveWorkEntry(dayId: string, entry: NewWorkEntry): Promise<WorkDay>;
  updateWorkDayFields(dayId: string, patch: WorkDayPatch): Promise<WorkDay>;
  setPayment(dayId: string, payment: { status: PaymentStatus; paidAmount: number }): Promise<WorkDay>;
  addPayment(dayId: string, amount: number, operationId: string): Promise<WorkDay>;
  markAllPaid(days: Array<Pick<WorkDay, 'id' | 'amount'>>): Promise<WorkDay[]>;
  replaceAssignments(dayId: string, assignments: NewAssignment[]): Promise<WorkDay>;
  deleteWorkDay(dayId: string): Promise<void>;
  addClient(input: { name: string; hourlyRate: number }): Promise<void>;
  updateClient(id: string, input: { name: string; hourlyRate: number }): Promise<void>;
  deleteClient(id: string): Promise<void>;
  addWorker(input: { name: string; color: string; isPrimary: boolean }): Promise<Worker>;
  deleteWorker(id: string): Promise<void>;
}
