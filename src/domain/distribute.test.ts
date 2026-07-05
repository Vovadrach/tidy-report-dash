import { describe, expect, it } from "vitest";
import { distributePayment, reconcile, type DayLike } from "./money";

const day = (id: string, date: string, amount: number, paidAmount = 0): DayLike => ({
  id,
  date,
  amount,
  paidAmount,
});

describe("reconcile (фікс B1)", () => {
  it("обрізає paidAmount до нової суми і робить статус paid", () => {
    // день був amount=100 paid=100; години зросли → amount=60
    expect(reconcile(60, 100)).toEqual({ paidAmount: 60, status: "paid" });
  });
  it("часткова лишається частковою", () => {
    expect(reconcile(100, 40)).toEqual({ paidAmount: 40, status: "partial" });
  });
  it("нуль оплати → unpaid", () => {
    expect(reconcile(100, 0)).toEqual({ paidAmount: 0, status: "unpaid" });
  });
  it("від'ємне зводиться до 0", () => {
    expect(reconcile(100, -5)).toEqual({ paidAmount: 0, status: "unpaid" });
  });
});

describe("distributePayment (R6 — найстаріші першими)", () => {
  const days = [
    day("new", "2026-03-10", 50),
    day("old", "2026-01-05", 40),
    day("mid", "2026-02-08", 30),
  ];

  it("кладе на найстаріший день першим", () => {
    const { allocations, applied, leftover } = distributePayment(days, 40);
    expect(applied).toBe(40);
    expect(leftover).toBe(0);
    expect(allocations).toEqual([{ id: "old", paidAmount: 40, status: "paid" }]);
  });

  it("переливається на наступні за віком дні", () => {
    const { allocations } = distributePayment(days, 55);
    expect(allocations).toEqual([
      { id: "old", paidAmount: 40, status: "paid" },
      { id: "mid", paidAmount: 15, status: "partial" },
    ]);
  });

  it("повна оплата всього боргу", () => {
    const { allocations, applied, leftover } = distributePayment(days, 120);
    expect(applied).toBe(120);
    expect(leftover).toBe(0);
    expect(allocations.map((a) => a.status)).toEqual(["paid", "paid", "paid"]);
  });

  it("надлишок повертається як leftover", () => {
    const { applied, leftover } = distributePayment(days, 200);
    expect(applied).toBe(120);
    expect(leftover).toBe(80);
  });

  it("пропускає вже оплачені дні", () => {
    const withPaid = [day("a", "2026-01-01", 40, 40), day("b", "2026-02-01", 30, 0)];
    const { allocations } = distributePayment(withPaid, 30);
    expect(allocations).toEqual([{ id: "b", paidAmount: 30, status: "paid" }]);
  });

  it("частково оплачений день добивається залишком", () => {
    const partial = [day("a", "2026-01-01", 40, 10)];
    const { allocations } = distributePayment(partial, 20);
    expect(allocations).toEqual([{ id: "a", paidAmount: 30, status: "partial" }]);
  });
});
