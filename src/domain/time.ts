/**
 * Домен часу: єдине місце конвертації "Г:ХВ" ⇄ десяткові години.
 * Раніше ця логіка існувала в 4 копіях (utils/timeFormat, Index,
 * CreateReport, WorkDayDetails) з розбіжною поведінкою.
 */

/** "8:30" | "8" | "8.5" → десяткові години. Порожньо/сміття → 0. */
export const hoursToDecimal = (hoursStr: string): number => {
  if (!hoursStr) return 0;

  if (hoursStr.includes(":")) {
    const [hours, minutes] = hoursStr.split(":").map((s) => parseInt(s) || 0);
    return (hours * 60 + minutes) / 60;
  }

  return parseFloat(hoursStr) || 0;
};

/**
 * Десяткові години → "8" (рівна година) або "8:30".
 * Хвилини округлюються до цілої хвилини. 0/NaN → "0".
 */
export const decimalToHours = (decimal: number): string => {
  if (!decimal || Number.isNaN(decimal)) return "0";
  const totalMinutes = Math.round(decimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}` : `${hours}:${minutes.toString().padStart(2, "0")}`;
};
