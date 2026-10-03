import { allocateUnits, resolveStatus, round2, toCents } from './money';
import type { WorkDay, WorkDayPatch } from './types';
import { validatePatch } from './validation';

/** Preserves historical payments; smaller totals require an explicit refund first. */
export const patchWorkDay = (day: WorkDay, input: WorkDayPatch): WorkDay => {
  const patch = validatePatch(input);
  const amount = patch.amount ?? day.amount;
  const hours = patch.hours ?? day.hours;
  if (toCents(amount) < toCents(day.paidAmount)) throw new Error('Нова сума менша за вже отриману оплату');
  const planned = patch.isPlanned ?? day.isPlanned;
  if (planned && (amount !== 0 || hours !== 0 || day.paidAmount !== 0) || !planned && (amount <= 0 || hours <= 0)) throw new Error('Перевірте години та суму роботи');
  if (day.assignments.length > toCents(amount)) throw new Error('Сума замала для часток усіх працівниць');
  const changed = amount !== day.amount || hours !== day.hours;
  const amounts = allocateUnits(toCents(amount), day.assignments.map(a => toCents(a.amount)));
  const minutes = allocateUnits(Math.round(hours * 60), day.assignments.map(a => a.hours));
  return {
    ...day, ...patch, note: patch.note === undefined ? day.note : patch.note ?? undefined,
    amount: round2(amount), status: resolveStatus(day.paidAmount, amount),
    assignments: changed ? day.assignments.map((a, i) => ({ ...a, amount: amounts[i] / 100, hours: minutes[i] / 60 })) : day.assignments,
  };
};
