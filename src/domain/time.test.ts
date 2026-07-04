import { describe, expect, it } from "vitest";
import { decimalToHours, hoursToDecimal } from "./time";

describe("hoursToDecimal", () => {
  it.each([
    ["", 0],
    ["0", 0],
    ["8", 8],
    ["8.5", 8.5],
    ["8:30", 8.5],
    ["8:00", 8],
    ["0:15", 0.25],
    ["0:10", 1 / 6],
    ["23:45", 23.75],
    ["100:30", 100.5], // колесо годин у деталях дня дозволяє до 100
    ["abc", 0],
    ["8:xx", 8],
  ])("%s → %d", (input, expected) => {
    expect(hoursToDecimal(input)).toBeCloseTo(expected, 10);
  });
});

describe("decimalToHours", () => {
  it.each([
    [0, "0"],
    [NaN, "0"],
    [8, "8"],
    [8.5, "8:30"],
    [0.25, "0:15"],
    [1 / 6, "0:10"],
    [23.75, "23:45"],
    [2.999999, "3"], // округлення до хвилини
    [1.0166666, "1:01"],
  ])("%d → %s", (input, expected) => {
    expect(decimalToHours(input)).toBe(expected);
  });

  it("округлення 59.6 хв не дає '1:60'", () => {
    expect(decimalToHours(1.9933333)).toBe("2");
  });
});

describe("інваріант: туди-назад", () => {
  it.each(["8:30", "0:15", "12", "23:45"])("%s стабільний", (s) => {
    expect(decimalToHours(hoursToDecimal(s))).toBe(s);
  });
});
