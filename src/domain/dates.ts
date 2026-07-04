import type { ISODate } from "./types";

/**
 * Домен дат. ЄДИНЕ місце перетворень Date ⇄ ISODate.
 * Всі дати застосунку — локальні (день зміни користувачки),
 * `toISOString()` для дат заборонений (UTC-зсув після 22:00 у Європі).
 */

export const toISODate = (d: Date): ISODate => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayLocal = (): ISODate => toISODate(new Date());

/** ISODate → Date опівночі локального часу (безпечно для порівнянь). */
export const fromISODate = (iso: ISODate): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

/** Межі місяця, в якому лежить дата-якір. */
export const monthRange = (anchor: Date): DateRange => {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: toISODate(from), to: toISODate(to) };
};

export const yearRange = (year: number): DateRange => ({
  from: `${year}-01-01`,
  to: `${year}-12-31`,
});

export const inRange = (date: ISODate, range: DateRange): boolean =>
  date >= range.from && date <= range.to;

export const isSameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export const addMonths = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

const MONTHS_UA = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень",
];

const DAYS_UA = [
  "Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота",
];

export const monthName = (index: number): string => MONTHS_UA[index] ?? "";
export const monthNames = (): readonly string[] => MONTHS_UA;

export const formatMonthYear = (d: Date): string =>
  `${MONTHS_UA[d.getMonth()]} ${d.getFullYear()}`;

export const dayOfWeekName = (iso: ISODate): string =>
  DAYS_UA[fromISODate(iso).getDay()];

export const dayNumber = (iso: ISODate): number => fromISODate(iso).getDate();

export const formatShortDate = (iso: ISODate): string =>
  fromISODate(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });

export const formatFullDate = (iso: ISODate): string =>
  fromISODate(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
