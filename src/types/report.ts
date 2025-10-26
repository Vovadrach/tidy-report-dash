export type PaymentStatus = "paid" | "partial" | "unpaid";
export type ReportStatus = "in_progress" | "completed";

export interface WorkDay {
  id: string;
  date: string;
  hours: number;
  amount: number;
  payment_status: PaymentStatus;
  note?: string;
  day_paid_amount?: number;
  paymentStatus?: PaymentStatus;
}

export interface Client {
  id: string;
  name: string;
  hourly_rate: number;
  hourlyRate?: number;
}

export interface Report {
  id: string;
  clientId: string;
  client_id?: string;
  clientName: string;
  client_name?: string;
  date: string;
  status: ReportStatus;
  paymentStatus: PaymentStatus;
  payment_status?: PaymentStatus;
  totalHours: number;
  total_hours?: number;
  totalEarned: number;
  total_earned?: number;
  paidAmount: number;
  paid_amount?: number;
  remainingAmount: number;
  remaining_amount?: number;
  workDays: WorkDay[];
}
