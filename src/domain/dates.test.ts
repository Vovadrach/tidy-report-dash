import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addMonths, formatMonthYear, fromISODate, inRange, monthRange, toISODate, todayLocal,
} from "./dates";

describe("todayLocal — АС FR-1.2 (23:30 за Римом не їде на добу)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("пізній вечір лишається сьогоднішньою локальною датою", () => {
    // 2026-07-04 23:30 локального часу (UTC-варіант дав би 07-05 при TZ<0
    // або 07-03/04 залежно від зсуву — саме цей клас багів ловимо)
    vi.setSystemTime(new Date(2026, 6, 4, 23, 30, 0));
    expect(todayLocal()).toBe("2026-07-04");
  });

  it("одразу після півночі — нова дата", () => {
    vi.setSystemTime(new Date(2026, 6, 5, 0, 5, 0));
    expect(todayLocal()).toBe("2026-07-05");
  });
});

describe("toISODate / fromISODate", () => {
  it("туди-назад стабільно", () => {
    const d = new Date(2026, 0, 31);
    expect(fromISODate(toISODate(d)).getTime()).toBe(d.getTime());
  });
  it("паддінг місяця й дня", () => {
    expect(toISODate(new Date(2026, 2, 7))).toBe("2026-03-07");
  });
});

describe("monthRange / inRange", () => {
  it("межі лютого невисокосного", () => {
    expect(monthRange(new Date(2026, 1, 15))).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
  it("межі грудня", () => {
    expect(monthRange(new Date(2026, 11, 1))).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });
  it("inRange включно з межами", () => {
    const r = monthRange(new Date(2026, 6, 10));
    expect(inRange("2026-07-01", r)).toBe(true);
    expect(inRange("2026-07-31", r)).toBe(true);
    expect(inRange("2026-08-01", r)).toBe(false);
  });
});

describe("addMonths / formatMonthYear", () => {
  it("перехід через рік", () => {
    expect(formatMonthYear(addMonths(new Date(2026, 11, 5), 1))).toBe("Січень 2027");
  });
  it("назад через рік", () => {
    expect(formatMonthYear(addMonths(new Date(2026, 0, 5), -1))).toBe("Грудень 2025");
  });
});
