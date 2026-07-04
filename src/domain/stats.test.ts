import { describe, expect, it } from "vitest";
import { clientBalances, debtors, monthlySummary, periodStats } from "./stats";
import type { WorkDay } from "./types";

const mk = (over: Partial<WorkDay>): WorkDay => ({
  id: Math.random().toString(36).slice(2),
  reportId: "r",
  clientId: "c1",
  clientName: "Марко",
  date: "2026-07-04",
  hours: 2,
  amount: 24,
  paidAmount: 0,
  status: "unpaid",
  isPlanned: false,
  assignments: [],
  ...over,
});

const july = { from: "2026-07-01", to: "2026-07-31" };

describe("periodStats", () => {
  it("сумує тільки період і не рахує планові", () => {
    const days = [
      mk({ date: "2026-07-01", hours: 2, amount: 24, paidAmount: 24, status: "paid" }),
      mk({ date: "2026-07-02", hours: 3, amount: 36 }),
      mk({ date: "2026-06-30", hours: 8, amount: 96 }),          // інший місяць
      mk({ date: "2026-07-10", isPlanned: true, amount: 100 }),   // планова
    ];
    const s = periodStats(days, july);
    expect(s.hours).toBe(5);
    expect(s.earned).toBe(60);
    expect(s.paid).toBe(24);
    expect(s.due).toBe(36);
    expect(s.progress).toBeCloseTo(0.4);
  });

  it("хвилини не втрачаються (2:30 + 2:30 = 5)", () => {
    const days = [mk({ hours: 2.5 }), mk({ hours: 2.5 })];
    expect(periodStats(days, july).hours).toBe(5);
  });

  it("фільтр працівниці — пропорційна частка часткової оплати", () => {
    const days = [mk({
      amount: 48, hours: 4, paidAmount: 24, status: "partial",
      assignments: [
        { id: "a1", workerId: "w1", workerName: "Л", workerColor: "#000", hours: 2, amount: 24 },
        { id: "a2", workerId: "w2", workerName: "О", workerColor: "#000", hours: 2, amount: 24 },
      ],
    })];
    const s = periodStats(days, july, "w1");
    expect(s.earned).toBe(24);
    expect(s.paid).toBe(12);
  });
});

describe("clientBalances / debtors", () => {
  const days = [
    mk({ clientId: "c1", clientName: "Марко", amount: 48, hours: 4, paidAmount: 48, status: "paid" }),
    mk({ clientId: "c1", clientName: "Марко", amount: 36, hours: 3 }),
    mk({ clientId: "c2", clientName: "Джулія", amount: 70, hours: 5, paidAmount: 20, status: "partial" }),
    mk({ clientId: "c3", clientName: "Верона", amount: 26, hours: 2, paidAmount: 26, status: "paid" }),
  ];

  it("баланси по клієнтах", () => {
    const b = clientBalances(days);
    const marco = b.find((x) => x.clientId === "c1")!;
    expect(marco.totalEarned).toBe(84);
    expect(marco.totalPaid).toBe(48);
    expect(marco.totalDue).toBe(36);
    expect(marco.unpaidHours).toBe(3);
  });

  it("боржники — без повністю оплачених, за спаданням боргу", () => {
    const d = debtors(days);
    expect(d.map((x) => x.clientId)).toEqual(["c2", "c1"]);
    expect(d[0].totalDue).toBe(50);
  });
});

describe("monthlySummary", () => {
  it("останні 3 місяці включно з поточним, порожні = нулі", () => {
    const days = [
      mk({ date: "2026-07-04", amount: 24, hours: 2, paidAmount: 24, status: "paid" }),
      mk({ date: "2026-05-10", amount: 50, hours: 5 }),
    ];
    const s = monthlySummary(days, 3, new Date(2026, 6, 15));
    expect(s.map((m) => m.month)).toEqual(["2026-05-01", "2026-06-01", "2026-07-01"]);
    expect(s[0]).toMatchObject({ earned: 50, paid: 0 });
    expect(s[1]).toMatchObject({ earned: 0 });
    expect(s[2]).toMatchObject({ earned: 24, paid: 24 });
  });
});
