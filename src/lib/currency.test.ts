// Dossier - Currency Conversion Unit Tests
// https://github.com/red-shadows-rs/dossier

import { describe, expect, it } from "vitest";
import {
  aggregateAmountsToCurrency,
  convertCurrency,
  getDirectRate,
} from "./currency";

describe("convertCurrency", () => {
  it("returns identical minor amount when from equals to", () => {
    expect(convertCurrency(5000, "SAR", "SAR")).toBe(5000);
    expect(convertCurrency(10000, "USD", "USD")).toBe(10000);
    expect(convertCurrency(0, "USD", "SAR")).toBe(0);
  });

  it("converts USD to SAR correctly with 2 decimal places", () => {
    expect(convertCurrency(10000, "USD", "SAR", { USD: 1, SAR: 3.75 })).toBe(
      37500,
    );
  });

  it("converts SAR to USD correctly with 2 decimal places", () => {
    expect(convertCurrency(37500, "SAR", "USD", { USD: 1, SAR: 3.75 })).toBe(
      10000,
    );
  });

  it("handles conversion to 3-decimal currencies like KWD", () => {
    const rates = { USD: 1, KWD: 0.308 };
    expect(convertCurrency(10000, "USD", "KWD", rates)).toBe(30800);
  });

  it("handles conversion from 3-decimal currencies like KWD to 2-decimal SAR", () => {
    const rates = { USD: 1, KWD: 0.308, SAR: 3.75 };
    expect(convertCurrency(30800, "KWD", "SAR", rates)).toBe(37500);
  });
});

describe("aggregateAmountsToCurrency", () => {
  it("returns 0 total for empty amounts array", () => {
    const res = aggregateAmountsToCurrency([], "SAR");
    expect(res.totalMinor).toBe(0);
    expect(res.isConverted).toBe(false);
  });

  it("sums amounts of matching currency without marking as converted", () => {
    const res = aggregateAmountsToCurrency(
      [
        { currency: "SAR", amountMinor: 1000 },
        { currency: "SAR", amountMinor: 2500 },
      ],
      "SAR",
    );
    expect(res.totalMinor).toBe(3500);
    expect(res.isConverted).toBe(false);
  });

  it("converts and aggregates foreign currencies into target currency", () => {
    const rates = { USD: 1, SAR: 3.75 };
    const res = aggregateAmountsToCurrency(
      [
        { currency: "SAR", amountMinor: 10000 },
        { currency: "USD", amountMinor: 10000 },
      ],
      "SAR",
      rates,
    );
    expect(res.totalMinor).toBe(47500);
    expect(res.isConverted).toBe(true);
    expect(res.originalAmounts).toHaveLength(2);
  });
});

describe("getDirectRate", () => {
  it("computes direct conversion multiplier", () => {
    const rates = { USD: 1, SAR: 3.75, EUR: 0.89 };
    expect(getDirectRate("USD", "SAR", rates)).toBe(3.75);
    expect(getDirectRate("SAR", "SAR", rates)).toBe(1.0);
    expect(getDirectRate("USD", "EUR", rates)).toBe(0.89);
  });
});
