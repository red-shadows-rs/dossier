import { describe, expect, it } from "vitest";
import { MAX_MINOR } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import {
  allocateByBp,
  allocateProportional,
  formatMinor,
  formatMoney,
  mulDivRound,
  normalizeDigits,
  parseMajorToMinor,
  percentOfBp,
} from "@/lib/money";

describe("mulDivRound / percentOfBp", () => {
  it("rounds half up (spec vectors)", () => {
    expect(mulDivRound(1005, 1500, 10000)).toBe(151);
    expect(mulDivRound(10, 1500, 10000)).toBe(2);
    expect(mulDivRound(1, 1, 2)).toBe(1);
    expect(mulDivRound(0, 9999, 10000)).toBe(0);
    expect(mulDivRound(MAX_MINOR, 10000, 10000)).toBe(MAX_MINOR);
  });

  it("throws on unsafe products and non-positive divisors", () => {
    expect(() => mulDivRound(9_007_199_254_740_991, 2, 1)).toThrow(AppError);
    expect(() => mulDivRound(1, 1, 0)).toThrow(AppError);
  });

  it("percentOfBp", () => {
    expect(percentOfBp(1_000_000, 1500)).toBe(150_000);
    expect(percentOfBp(1_000_001, 1500)).toBe(150_000);
  });
});

describe("parseMajorToMinor", () => {
  it("parses the spec vectors", () => {
    expect(parseMajorToMinor("1234.5", "SAR")).toBe(123450);
    expect(parseMajorToMinor("1,234.50", "SAR")).toBe(123450);
    expect(parseMajorToMinor("١٢٣٤٫٥٠", "SAR")).toBe(123450);
    expect(parseMajorToMinor("0.001", "KWD")).toBe(1);
  });

  it("rejects invalid inputs", () => {
    for (const input of ["12.345", "-5", "abc", "", "1e3", "1.2.3"]) {
      expect(() => parseMajorToMinor(input, "SAR")).toThrow(AppError);
    }
  });

  it("rejects amounts above MAX_MINOR", () => {
    expect(() => parseMajorToMinor(String(MAX_MINOR + 1), "SAR")).toThrow(
      AppError,
    );
  });

  it("rejects an unsupported currency at runtime", () => {
    expect(() => parseMajorToMinor("1", "XXX" as unknown as "SAR")).toThrow(
      AppError,
    );
  });
});

describe("formatMinor / formatMoney", () => {
  it("matches the spec vectors", () => {
    expect(formatMoney(123450, "SAR", "en")).toBe("1,234.50 SAR");
    expect(formatMoney(123450, "SAR", "ar")).toBe("1,234.50 SAR");
    expect(formatMoney(5, "SAR", "en")).toBe("0.05 SAR");
    expect(formatMoney(1, "KWD", "en")).toBe("0.001 KWD");
    expect(formatMoney(1_000_000_000, "USD", "en")).toBe("10,000,000.00 USD");
  });

  it("formatMinor omits the currency code", () => {
    expect(formatMinor(123450, "SAR", "en")).toBe("1,234.50");
  });
});

describe("allocateProportional / allocateByBp", () => {
  it("matches the spec vectors", () => {
    expect(allocateByBp(1_000_001, [3000, 4000, 3000])).toEqual([
      300000, 400001, 300000,
    ]);
    expect(allocateByBp(100, [3333, 3333, 3334])).toEqual([33, 34, 33]);
    expect(allocateByBp(1, [5000, 5000])).toEqual([1, 0]);
    expect(allocateByBp(0, [10000])).toEqual([0]);
    expect(allocateProportional(150000, [300000, 400001, 300000])).toEqual([
      45000, 60000, 45000,
    ]);
    expect(allocateProportional(5, [1, 1, 1, 1, 1])).toEqual([1, 1, 1, 1, 1]);
    expect(allocateProportional(7, [0, 0])).toEqual([0, 0]);
  });

  it("allocateByBp throws when basis points do not sum to 10000", () => {
    expect(() => allocateByBp(10, [5000, 4000])).toThrow(AppError);
  });

  it("property: parts are non-negative and sum to total", () => {
    for (let i = 0; i < 500; i += 1) {
      const total = Math.floor(Math.random() * 1_000_000);
      const count = 1 + Math.floor(Math.random() * 8);
      const weights = Array.from({ length: count }, () =>
        Math.floor(Math.random() * 10_000),
      );
      const parts = allocateProportional(total, weights);
      expect(parts).toHaveLength(count);
      expect(parts.every((part) => part >= 0)).toBe(true);
      const weightSum = weights.reduce((acc, weight) => acc + weight, 0);
      const expected = weightSum === 0 ? 0 : total;
      expect(parts.reduce((acc, part) => acc + part, 0)).toBe(expected);
    }
  });
});

describe("normalizeDigits", () => {
  it("converts Arabic-Indic, Persian and separators to Western", () => {
    expect(normalizeDigits("١٢٣٤٫٥٠")).toBe("1234.50");
    expect(normalizeDigits("۱۲۳۴")).toBe("1234");
    expect(normalizeDigits("١٬٢٣٤")).toBe("1,234");
  });
});
