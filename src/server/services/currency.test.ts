// Dossier - Server Currency Service Unit Tests
// https://github.com/red-shadows-rs/dossier

import { describe, expect, it } from "vitest";
import { getCachedExchangeRates, refreshExchangeRates } from "./currency";

describe("currency service", () => {
  it("returns exchange rates with fallback defaults when offline or initial", () => {
    const cached = getCachedExchangeRates();
    expect(cached.rates).toBeDefined();
    expect(cached.rates.SAR).toBeGreaterThan(0);
    expect(cached.rates.USD).toBe(1);
    expect(cached.rates.USDT).toBe(1);
  });

  it("refreshes exchange rates safely without throwing", async () => {
    const res = await refreshExchangeRates();
    expect(res.rates).toBeDefined();
    expect(res.rates.SAR).toBeGreaterThan(0);
    expect(res.updatedAt).toBeGreaterThan(0);
  });
});
