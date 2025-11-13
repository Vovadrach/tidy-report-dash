export type PaymentStatus = "paid" | "partial" | "unpaid";
export type ReportStatus = "in_progress" | "completed";

export interface Worker {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_primary: boolean;
  isPrimary?: boolean;
  created_at?: string;
}

export interface WorkDayAssignment {
  id: string;
  work_day_id: string;
  workDayId?: string;
  worker_id: string | null;
  workerId?: string | null;
  amount: number;
  hours: number;
  worker?: Worker | null;
  deleted_worker_name?: string | null;
  created_at?: string;
}

export interface WorkDay {
  id: string;
  date: string;
  hours: number;
  amount: number;
  payment_status: PaymentStatus;
  note?: string;
  day_paid_amount?: number;
  paymentStatus?: PaymentStatus;
  assignments?: WorkDayAssignment[];
  is_planned?: boolean;
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
