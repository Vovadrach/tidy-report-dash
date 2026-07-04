/** Канонічна доменна модель v3 (V3-SPEC §6.3). Лише camelCase. */

export type PaymentStatus = "paid" | "partial" | "unpaid";

/** Дата без часу у форматі YYYY-MM-DD, ЛОКАЛЬНА (не UTC). */
export type ISODate = string;

export interface Worker {
  id: string;
  name: string;
  color: string;
  isPrimary: boolean;
}

export interface Assignment {
  id: string;
  workerId: string | null;
  /** Ім'я на випадок видаленої працівниці */
  workerName: string;
  workerColor: string;
  hours: number;
  amount: number;
}

export interface WorkDay {
  id: string;
  /**
   * Перехідне поле старої схеми (день живе всередині report).
   * Зникає після застосування міграцій v3.
   */
  reportId: string;
  clientId: string;
  clientName: string;
  date: ISODate;
  hours: number;
  amount: number;
  paidAmount: number;
  status: PaymentStatus;
  isPlanned: boolean;
  note?: string;
  assignments: Assignment[];
}

export interface Client {
  id: string;
  name: string;
  hourlyRate: number;
}

export interface NewAssignment {
  workerId: string;
  hours: number;
  amount: number;
}

export interface NewWorkEntry {
  clientId: string;
  clientName: string;
  date: ISODate;
  hours: number;
  amount: number;
  status: PaymentStatus;
  paidAmount: number;
  isPlanned: boolean;
  note?: string;
  assignments: NewAssignment[];
}
