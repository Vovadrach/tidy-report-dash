export type PaymentStatus = "paid" | "partial" | "unpaid";
export type ReportStatus = "in_progress" | "completed";

export interface WorkDay {
  id: string;
  date: string;
  hours: number;
  amount: number;
  paymentStatus: PaymentStatus;
  note?: string;
}

export interface Client {
  id: string;
  name: string;
  hourlyRate: number;
}

export interface Report {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  status: ReportStatus;
  paymentStatus: PaymentStatus;
  totalHours: number;
  totalEarned: number;
  paidAmount: number;
  remainingAmount: number;
  workDays: WorkDay[];
}
