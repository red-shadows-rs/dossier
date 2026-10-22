// Dossier - Server Currency Service
// https://github.com/red-shadows-rs/dossier

import { z } from "zod";
import { DEFAULT_RATES, type ExchangeRates } from "@/lib/currency";
import { nowMs } from "@/lib/dates";
import { getInternalSetting, setInternalSetting } from "@/server/services/settings";

const exchangeRatesCacheSchema = z.object({
  updatedAt: z.number(),
  rates: z.record(z.string(), z.number()),
});

type ExchangeRatesCache = z.infer<typeof exchangeRatesCacheSchema>;

const CACHE_TTL_MS = 60 * 60 * 1000;
const SETTINGS_KEY = "exchange_rates";

let inMemoryCache: ExchangeRatesCache | null = null;
let activeFetchPromise: Promise<ExchangeRatesCache> | null = null;

async function fetchFromApi(): Promise<ExchangeRates | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result !== "success" || !data.rates) return null;

    const merged: ExchangeRates = { ...DEFAULT_RATES };
    for (const [code, rate] of Object.entries(data.rates)) {
      if (typeof rate === "number" && rate > 0) {
        merged[code] = rate;
      }
    }
    merged.USDT = 1.0;
    return merged;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshExchangeRates(): Promise<ExchangeRatesCache> {
  if (activeFetchPromise) return activeFetchPromise;

  activeFetchPromise = (async () => {
    try {
      const live = await fetchFromApi();
      const now = nowMs();
      if (live) {
        const cache: ExchangeRatesCache = {
          updatedAt: now,
          rates: live,
        };
        inMemoryCache = cache;
        try {
          setInternalSetting(SETTINGS_KEY, cache);
        } catch {}
        return cache;
      }
    } finally {
      activeFetchPromise = null;
    }

    const fallback: ExchangeRatesCache = {
      updatedAt: inMemoryCache?.updatedAt ?? nowMs(),
      rates: inMemoryCache?.rates ?? DEFAULT_RATES,
    };
    return fallback;
  })();

  return activeFetchPromise;
}

export function getCachedExchangeRates(): {
  rates: ExchangeRates;
  updatedAt: number;
} {
  const now = nowMs();

  if (inMemoryCache && now - inMemoryCache.updatedAt < CACHE_TTL_MS) {
    return inMemoryCache;
  }

  try {
    const stored = getInternalSetting(SETTINGS_KEY, exchangeRatesCacheSchema);
    if (stored) {
      inMemoryCache = stored;
      if (now - stored.updatedAt >= CACHE_TTL_MS) {
        void refreshExchangeRates();
      }
      return stored;
    }
  } catch {}

  void refreshExchangeRates();

  return {
    rates: inMemoryCache?.rates ?? DEFAULT_RATES,
    updatedAt: inMemoryCache?.updatedAt ?? now,
  };
}
