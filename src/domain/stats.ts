import type { DateRange } from "./dates";
import { inRange } from "./dates";
import { involvesWorker, workerView } from "./money";
import type { ISODate, WorkDay } from "./types";

/**
 * Агрегати над робочими днями. До застосування міграцій v3 заміщують
 * Postgres-в'ю client_balances/monthly_summary (той самий контракт).
 */

export interface PeriodStats {
  hours: number;
  earned: number;
  paid: number;
  due: number;
  /** 0..1, частка оплаченого від заробленого */
  progress: number;
}

/** Статистика періоду очима обраної працівниці. Планові дні не рахуються. */
export const periodStats = (
  days: WorkDay[],
  range: DateRange,
  workerId: string | "all" = "all",
): PeriodStats => {
  let minutes = 0;
  let earned = 0;
  let paid = 0;
  for (const day of days) {
    if (day.isPlanned) continue;
    if (!inRange(day.date, range)) continue;
    if (!involvesWorker(day, workerId)) continue;
    const v = workerView(day, workerId);
    minutes += Math.round(v.hours * 60);
    earned += v.amount;
    paid += v.paid;
  }
  const hours = minutes / 60;
  return {
    hours,
    earned,
    paid,
    due: earned - paid,
    progress: earned > 0 ? Math.min(paid / earned, 1) : 0,
  };
};

export interface ClientBalance {
  clientId: string;
  clientName: string;
  totalEarned: number;
  totalHours: number;
  totalPaid: number;
  totalDue: number;
  unpaidHours: number;
}

/** Баланси по клієнтах (аналог в'ю client_balances). */
export const clientBalances = (
  days: WorkDay[],
  workerId: string | "all" = "all",
): ClientBalance[] => {
  const map = new Map<string, ClientBalance>();
  for (const day of days) {
    if (day.isPlanned) continue;
    if (!involvesWorker(day, workerId)) continue;
    const v = workerView(day, workerId);
    if (v.amount === 0 && v.hours === 0) continue;
    const b = map.get(day.clientId) ?? {
      clientId: day.clientId,
      clientName: day.clientName,
      totalEarned: 0,
      totalHours: 0,
      totalPaid: 0,
      totalDue: 0,
      unpaidHours: 0,
    };
    b.totalEarned += v.amount;
    b.totalHours += v.hours;
    b.totalPaid += v.paid;
    b.totalDue += v.due;
    if (v.amount > 0) {
      b.unpaidHours += v.hours * (v.due / v.amount);
    }
    map.set(day.clientId, b);
  }
  return [...map.values()];
};

/** Клієнти з боргом, за спаданням боргу. */
export const debtors = (days: WorkDay[], workerId: string | "all" = "all"): ClientBalance[] =>
  clientBalances(days, workerId)
    .filter((b) => b.totalDue > 0.005)
    .sort((a, b) => b.totalDue - a.totalDue);

export interface MonthSummary {
  /** Перший день місяця */
  month: ISODate;
  hours: number;
  earned: number;
  paid: number;
}

/** Останні `count` місяців включно з поточним (аналог в'ю monthly_summary). */
export const monthlySummary = (
  days: WorkDay[],
  count: number,
  now: Date,
  workerId: string | "all" = "all",
): MonthSummary[] => {
  const result: MonthSummary[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}`;
    let minutes = 0;
    let earned = 0;
    let paid = 0;
    for (const day of days) {
      if (day.isPlanned) continue;
      if (!day.date.startsWith(key)) continue;
      if (!involvesWorker(day, workerId)) continue;
      const v = workerView(day, workerId);
      minutes += Math.round(v.hours * 60);
      earned += v.amount;
      paid += v.paid;
    }
    result.push({ month: `${key}-01`, hours: minutes / 60, earned, paid });
  }
  return result;
};
