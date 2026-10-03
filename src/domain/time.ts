/**
 * Домен часу: єдине місце конвертації "Г:ХВ" ⇄ десяткові години.
 * Раніше ця логіка існувала в 4 копіях (utils/timeFormat, Index,
 * CreateReport, WorkDayDetails) з розбіжною поведінкою.
 */

/** "8:30" | "8" | "8.5" → десяткові години. Порожньо/сміття → 0. */
export const hoursToDecimal = (hoursStr: string): number => {
  const value = hoursStr.trim().replace(",", ".");
  if (!value) return 0;
  if (/^\d+:\d{1,2}$/.test(value)) {
    const [hours, minutes] = value.split(":").map(Number);
    return minutes < 60 ? hours + minutes / 60 : 0;
  }
  if (!/^\d+(?:\.\d+)?$/.test(value)) return 0;
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

/**
 * Десяткові години → "8" (рівна година) або "8:30".
 * Хвилини округлюються до цілої хвилини. 0/NaN → "0".
 */
export const decimalToHours = (decimal: number): string => {
  if (!Number.isFinite(decimal) || decimal <= 0) return "0";
  const totalMinutes = Math.round(decimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}` : `${hours}:${minutes.toString().padStart(2, "0")}`;
};
