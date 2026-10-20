import { describe, expect, it } from "vitest";
import { allocateUnits, applyPartialPayment, assignmentViews, calculateAmount, paymentView, resolveStatus, toWholeEuros, validateSplit, workerView } from "./money";
import type { WorkDay } from "./types";

const day = (over: Partial<WorkDay> = {}): WorkDay => ({
  id: "d1",
  reportId: "r1",
  clientId: "c1",
  clientName: "Клієнт",
  date: "2026-07-04",
  hours: 4,
  amount: 48,
  paidAmount: 0,
  status: "unpaid",
  isPlanned: false,
  assignments: [],
  ...over,
});

describe("resolveStatus (інваріант R-2)", () => {
  it.each([
    [0, 48, "unpaid"],
    [-5, 48, "unpaid"],
    [10, 48, "partial"],
    [48, 48, "paid"],
    [50, 48, "paid"],
    [0, 0, "unpaid"],
  ] as const)("paid=%d amount=%d → %s", (paid, amount, expected) => {
    expect(resolveStatus(paid, amount)).toBe(expected);
  });
});

describe("applyPartialPayment", () => {
  it("додає і перераховує статус", () => {
    const r = applyPartialPayment(day({ paidAmount: 10 }), 20);
    expect(r).toMatchObject({ ok: true, paidAmount: 30, status: "partial" });
  });
  it("докладає до повної — paid", () => {
    const r = applyPartialPayment(day({ paidAmount: 40 }), 8);
    expect(r).toMatchObject({ ok: true, paidAmount: 48, status: "paid" });
  });
  it("перевищення — помилка exceeds, стан не змінюється", () => {
    const r = applyPartialPayment(day({ paidAmount: 40 }), 9);
    expect(r).toMatchObject({ ok: false, error: "exceeds", paidAmount: 40 });
  });
  it.each([0, -1, NaN])("некоректна сума %d — invalid", (add) => {
    expect(applyPartialPayment(day(), add).ok).toBe(false);
  });
});

describe("workerView", () => {
  const shared = day({
    amount: 48,
    hours: 4,
    paidAmount: 24,
    assignments: [
      { id: "a1", workerId: "w1", workerName: "Лідія", workerColor: "#000", hours: 2, amount: 24 },
      { id: "a2", workerId: "w2", workerName: "Оксана", workerColor: "#000", hours: 2, amount: 24 },
    ],
  });

  it("all — повний день", () => {
    expect(workerView(shared, "all")).toEqual({ hours: 4, amount: 48, paid: 24, due: 24 });
  });
  it("частка працівниці пропорційна", () => {
    expect(workerView(shared, "w1")).toEqual({ hours: 2, amount: 24, paid: 12, due: 12 });
  });
  it("непризначена — нулі", () => {
    expect(workerView(shared, "w9")).toEqual({ hours: 0, amount: 0, paid: 0, due: 0 });
  });
  it("переплата не дає paid > amount", () => {
    const over = day({ paidAmount: 60, amount: 48 });
    expect(workerView(over, "all").paid).toBe(48);
  });
});

describe("облік у цілих євро", () => {
  it.each([[24.75, 25], [24.25, 24], [1.5, 2], [1.499, 1]])("округлює %s до %s без подвійного округлення", (input, expected) => {
    expect(toWholeEuros(input)).toBe(expected);
  });

  it("округлює вартість роботи один раз до цілого євро", () => {
    expect(calculateAmount(10 / 60, 12.5)).toBe(2);
    expect(calculateAmount(1 / 60, 29.99)).toBe(0);
  });

  it.each([0.18, 0.2, 0.37, 0.5, 0.99])("не вважає залишок %s євро боргом", remainder => {
    expect(paymentView(30, 30 - remainder)).toEqual({ amount: 30, paid: 30, due: 0 });
  });

  it("зберігає борг від одного євро і не довіряє застарілому статусу", () => {
    expect(workerView(day({ amount: 30.25, paidAmount: 20, status: 'paid' }), 'all'))
      .toEqual({ hours: 4, amount: 30, paid: 20, due: 10 });
    expect(paymentView(30, 29)).toEqual({ amount: 30, paid: 29, due: 1 });
  });

  it("розподіляє цілі євро між працівницями без втрати підсумків", () => {
    const shared = day({ amount: 100, paidAmount: 50, assignments: [33.33, 33.33, 33.34].map((amount, i) => ({
      id: `a${i}`, workerId: `w${i}`, workerName: 'Працівниця', workerColor: '#000', hours: 1, amount,
    })) });
    const shares = assignmentViews(shared);
    expect(shares.map(share => share.amount)).toEqual([33, 33, 34]);
    expect(shares.reduce((sum, share) => sum + share.paid, 0)).toBe(50);
    expect(shares.reduce((sum, share) => sum + share.due, 0)).toBe(50);
    expect(allocateUnits(100, [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it("не розподіляє непризначені суми між працівницями", () => {
    const shared = day({ amount: 30, paidAmount: 15, assignments: [
      { id: 'a', workerId: 'w', workerName: 'Працівниця', workerColor: '#000', hours: 1, amount: 10 },
    ] });
    expect(workerView(shared, 'w')).toEqual({ hours: 1, amount: 10, paid: 5, due: 5 });
  });
});

describe("validateSplit", () => {
  it("порожній розподіл — валідний (без працівниць)", () => {
    expect(validateSplit(48, []).valid).toBe(true);
  });
  it("рівний розподіл — валідний", () => {
    expect(validateSplit(48, [
      { workerId: "w1", amount: 24 },
      { workerId: "w2", amount: 24 },
    ]).valid).toBe(true);
  });
  it("недорозподіл — remainder > 0, invalid", () => {
    const v = validateSplit(48, [{ workerId: "w1", amount: 30 }]);
    expect(v.valid).toBe(false);
    expect(v.remainder).toBe(18);
  });
  it("нульова частка — invalid із переліком", () => {
    const v = validateSplit(48, [
      { workerId: "w1", amount: 48 },
      { workerId: "w2", amount: 0 },
    ]);
    expect(v.valid).toBe(false);
    expect(v.emptyWorkerIds).toEqual(["w2"]);
  });
});
