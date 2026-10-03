import { formatMoney } from "./money";
import { decimalToHours } from "./time";
import type { ClientBalance } from "./stats";

/** Текст нагадування клієнту про борг (FR-3.2). */
export const reminderMessage = (balance: ClientBalance): string =>
  `Добрий день! 🌿 Нагадую про оплату за прибирання: ` +
  `${decimalToHours(balance.unpaidHours)} год — ${formatMoney(balance.totalDue)}€. Дякую!`;
