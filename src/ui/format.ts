import { decimalToHours } from "@/domain/time";

/** Форматування для відображення (мова «Ясно»). */

/** Сума в €: ціле — без копійок, інакше з комою. Символ € рендерить <Money/>. */
export const formatEuro = (n: number): string => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(".", ",");
};

/** Години: "4 г" / "4:30 г". Нуль → порожньо. */
export const formatHours = (dec: number): string =>
  !dec ? "" : `${decimalToHours(dec)} г`;
