// Dossier - Currency Conversion Library
// https://github.com/red-shadows-rs/dossier

import { CURRENCIES, type CurrencyCode } from "@/lib/constants";

export type ExchangeRates = Record<string, number>;

export const DEFAULT_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,
  USDT: 1.0,
  SAR: 3.75,
  AED: 3.6725,
  QAR: 3.64,
  KWD: 0.308,
  BHD: 0.376,
  OMR: 0.3845,
  JOD: 0.709,
  EUR: 0.89,
  GBP: 0.75,
  EGP: 50.0,
};

export type CurrencyAmount = {
  currency: string;
  amountMinor: number;
};

export type ConvertedAggregate = {
  targetCurrency: CurrencyCode;
  totalMinor: number;
  isConverted: boolean;
  originalAmounts: CurrencyAmount[];
};

export function convertCurrency(
  amountMinor: number,
  from: string,
  to: string,
  rates: ExchangeRates = DEFAULT_RATES,
): number {
  if (amountMinor === 0 || from === to) {
    return amountMinor;
  }

  const fromCode = from as CurrencyCode;
  const toCode = to as CurrencyCode;

  const fromExp = CURRENCIES[fromCode] ?? 2;
  const toExp = CURRENCIES[toCode] ?? 2;

  const fromRate = rates[from] ?? DEFAULT_RATES[fromCode] ?? 1.0;
  const toRate = rates[to] ?? DEFAULT_RATES[toCode] ?? 1.0;

  if (fromRate <= 0) return amountMinor;

  const fromMajor = amountMinor / Math.pow(10, fromExp);
  const usdMajor = fromMajor / fromRate;
  const toMajor = usdMajor * toRate;

  return Math.round(toMajor * Math.pow(10, toExp));
}

export function aggregateAmountsToCurrency(
  amounts: CurrencyAmount[],
  targetCurrency: CurrencyCode,
  rates: ExchangeRates = DEFAULT_RATES,
): ConvertedAggregate {
  if (amounts.length === 0) {
    return {
      targetCurrency,
      totalMinor: 0,
      isConverted: false,
      originalAmounts: [],
    };
  }

  let totalMinor = 0;
  let isConverted = false;

  for (const entry of amounts) {
    if (entry.currency !== targetCurrency) {
      isConverted = true;
      totalMinor += convertCurrency(
        entry.amountMinor,
        entry.currency,
        targetCurrency,
        rates,
      );
    } else {
      totalMinor += entry.amountMinor;
    }
  }

  return {
    targetCurrency,
    totalMinor,
    isConverted,
    originalAmounts: amounts,
  };
}

export function getDirectRate(
  from: string,
  to: string,
  rates: ExchangeRates = DEFAULT_RATES,
): number {
  if (from === to) return 1.0;
  const fromCode = from as CurrencyCode;
  const toCode = to as CurrencyCode;
  const fromRate = rates[from] ?? DEFAULT_RATES[fromCode] ?? 1.0;
  const toRate = rates[to] ?? DEFAULT_RATES[toCode] ?? 1.0;
  if (fromRate <= 0) return 1.0;
  return toRate / fromRate;
}
