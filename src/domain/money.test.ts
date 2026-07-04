import { describe, expect, it } from "vitest";
import { applyPartialPayment, resolveStatus, validateSplit, workerView } from "./money";
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
