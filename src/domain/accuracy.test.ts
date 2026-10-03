import { describe, expect, it } from 'vitest';
import { allocateUnits, applyPartialPayment, calculateAmount, parseNumber, round2, toCents, validateSplit, workerView } from './money';
import { isISODate } from './dates';
import { validateEntry, validatePatch } from './validation';
import { patchWorkDay } from './workDay';
import { monthlySummary, periodStats } from './stats';
import type { NewWorkEntry, WorkDay } from './types';

const entry = (over: Partial<NewWorkEntry> = {}): NewWorkEntry => ({ clientId: 'c',clientName: 'Клієнт',date: '2026-10-03',hours: 1,amount: 12.5,paidAmount: 0,status: 'unpaid',isPlanned: false,assignments: [],...over });
const day = (over: Partial<WorkDay> = {}): WorkDay => ({ ...entry(),id: 'd',reportId: 'r',assignments: [],...over });

describe('копійки і коректні значення', () => {
  it.each([[10.075,10.08],[1.005,1.01],[12.345,12.35],[14.25,14.25]])('округлення %s до %s', (input,output) => expect(round2(input)).toBe(output));
  it('десять хвилин не округлюються до цілих євро', () => expect(calculateAmount(10/60,12.5)).toBe(2.08));
  it('сума 0.10 + 0.20 точно завершує оплату 0.30', () => expect(applyPartialPayment(day({ amount: 0.3,paidAmount: 0.1 }),0.2)).toMatchObject({ ok: true,paidAmount: 0.3,status: 'paid' }));
  it.each(['-1','12abc','Infinity','NaN','','1.2.3'])('відхиляє %s', input => expect(Number.isNaN(parseNumber(input))).toBe(true));
  it('приймає кому', () => expect(parseNumber(' 12,75 ')).toBe(12.75));
  it('розподіляє останню копійку без втрати або подвоєння', () => {
    const shared = day({ amount: 0.03,paidAmount: 0.01,assignments: [0,1,2].map(i => ({ id: `a${i}`,workerId: `w${i}`,workerName: 'Ім’я',workerColor: '#000000',hours: 1/3,amount: 0.01 })) });
    expect([0,1,2].reduce((sum,i) => sum + toCents(workerView(shared,`w${i}`).paid),0)).toBe(1);
    expect(allocateUnits(100,[1,1,1])).toEqual([34,33,33]);
  });
  it('не дозволяє одну працівницю двічі', () => expect(validateSplit(10,[{ workerId: 'w',amount: 5 },{ workerId: 'w',amount: 5 }]).valid).toBe(false));
  it.each(['2026-02-29','2026-02-30','2026-13-01','2026-1-03','2026-10-03T00:00:00','0000-01-01'])('відхиляє неможливу дату %s', value => expect(isISODate(value)).toBe(false));
  it('приймає високосний день', () => expect(isISODate('2028-02-29')).toBe(true));
});

describe('інваріанти записів і історії', () => {
  it.each([NaN,Infinity,-1])('не пропускає некоректну суму %s', amount => expect(() => validateEntry(entry({ amount }))).toThrow());
  it('не допускає оплату майбутнього плану', () => expect(() => validateEntry(entry({ isPlanned: true }))).toThrow());
  it('виводить статус з реально отриманої суми', () => expect(validateEntry(entry({ status: 'paid',paidAmount: 0 })).status).toBe('unpaid'));
  it('не дозволяє переплату', () => expect(() => validateEntry(entry({ paidAmount: 13 }))).toThrow());
  it('перевіряє дату при редагуванні', () => expect(() => validatePatch({ date: '2026-02-30' })).toThrow());
  it('зміна лише нотатки не змінює історичну суму', () => expect(patchWorkDay(day({ amount: 14.25 }),{ note: 'Нова нотатка' }).amount).toBe(14.25));
  it('зменшення вартості не стирає отриману оплату', () => expect(() => patchWorkDay(day({ paidAmount: 10 }),{ amount: 9 })).toThrow());
  it('редагування суми розподіляє всі копійки й хвилини', () => {
    const shared = day({ amount: 30,hours: 3,assignments: [0,1,2].map(i => ({ id: `a${i}`,workerId: `w${i}`,workerName: 'Ім’я',workerColor: '#000000',hours: 1,amount: 10 })) });
    const next = patchWorkDay(shared,{ amount: 10,hours: 1 });
    expect(next.assignments.reduce((sum,a) => sum + toCents(a.amount),0)).toBe(1000);
    expect(next.assignments.reduce((sum,a) => sum + Math.round(a.hours*60),0)).toBe(60);
  });
  it('агрегує довгу історію без втрати копійок', () => {
    const rows = Array.from({ length: 1001 },(_,i) => day({ id: `d${i}`,amount: 0.1,paidAmount: 0.1 }));
    expect(periodStats(rows,{ from: '2026-10-01',to: '2026-10-31' })).toMatchObject({ earned: 100.1,paid: 100.1,due: 0 });
    expect(monthlySummary(rows,6,new Date(2026,9,3))[5]).toMatchObject({ earned: 100.1,paid: 100.1 });
  });
});
