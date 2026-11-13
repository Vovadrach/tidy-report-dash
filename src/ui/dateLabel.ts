import { fromISODate, toISODate } from "@/domain/dates";
import type { useI18n } from "@/i18n";

type I18n = ReturnType<typeof useI18n>;

const shift = (iso: string, days: number) => {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
};

/**
 * Людська дата: «Сьогодні, 12 листопада», «Вчора, 11 листопада»,
 * «Пт, 25 вересня», а для іншого року — «Пт, 25 вересня 2025».
 */
export const dayLabel = (iso: string, today: string, i18n: Pick<I18n, "t" | "monthsOf" | "weekdaysShort">) => {
  const d = fromISODate(iso);
  const base = `${d.getDate()} ${i18n.monthsOf[d.getMonth()]}`;
  if (iso === today) return `${i18n.t("common.today")}, ${base}`;
  if (iso === shift(today, -1)) return `${i18n.t("common.yesterday")}, ${base}`;
  if (iso === shift(today, 1)) return `${i18n.t("common.tomorrow")}, ${base}`;
  const year = d.getFullYear() !== fromISODate(today).getFullYear() ? ` ${d.getFullYear()}` : "";
  return `${i18n.weekdaysShort[d.getDay()]}, ${base}${year}`;
};

export const shiftISO = shift;
