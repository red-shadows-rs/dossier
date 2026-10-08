import type { CurrencyCode, Locale } from "@/lib/constants";
import { CURRENCIES, MAX_MINOR } from "@/lib/constants";
import { AppError } from "@/lib/errors";

export type Minor = number;

const ARABIC_INDIC_START = 0x0660;
const ARABIC_INDIC_END = 0x0669;
const PERSIAN_START = 0x06f0;
const PERSIAN_END = 0x06f9;
const ARABIC_DECIMAL_SEPARATOR = "\u066b";
const ARABIC_THOUSANDS_SEPARATOR = "\u066c";

export function normalizeDigits(input: string): string {
  let out = "";
  for (const char of input) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= ARABIC_INDIC_START && code <= ARABIC_INDIC_END) {
      out += String(code - ARABIC_INDIC_START);
    } else if (code >= PERSIAN_START && code <= PERSIAN_END) {
      out += String(code - PERSIAN_START);
    } else if (char === ARABIC_DECIMAL_SEPARATOR) {
      out += ".";
    } else if (char === ARABIC_THOUSANDS_SEPARATOR) {
      out += ",";
    } else {
      out += char;
    }
  }
  return out;
}

export function parseMajorToMinor(
  input: string,
  currency: CurrencyCode,
): Minor {
  const exponent: number | undefined = CURRENCIES[currency];
  if (exponent === undefined) {
    throw new AppError(
      "VALIDATION_FAILED",
      `Unsupported currency: ${String(currency)}`,
    );
  }

  const normalized = normalizeDigits(input)
    .replace(/\s/g, "")
    .replace(/,/g, "");

  const pattern = new RegExp(`^\\d+(\\.\\d{1,${exponent}})?$`);
  if (!pattern.test(normalized)) {
    throw new AppError("VALIDATION_FAILED", "Invalid amount");
  }

  const [intPart, fracPart = ""] = normalized.split(".");
  const factor = 10 ** exponent;
  const minor =
    Number(intPart) * factor + Number(fracPart.padEnd(exponent, "0"));

  if (!Number.isSafeInteger(minor) || minor > MAX_MINOR) {
    throw new AppError("VALIDATION_FAILED", "Amount out of range");
  }
  return minor;
}

export function formatMinor(
  minor: Minor,
  currency: CurrencyCode,
  _locale: Locale,
): string {
  const exponent = CURRENCIES[currency];
  const factor = 10 ** exponent;
  const intPart = Math.floor(minor / factor);
  const grouped = new Intl.NumberFormat("en-US").format(intPart);
  const fracPart = String(minor % factor).padStart(exponent, "0");
  return `${grouped}.${fracPart}`;
}

export function formatMoney(
  minor: Minor,
  currency: CurrencyCode,
  locale: Locale,
): string {
  return `${formatMinor(minor, currency, locale)} ${currency}`;
}

export function mulDivRound(a: number, b: number, d: number): number {
  if (d <= 0) {
    throw new AppError("INTERNAL", "mulDivRound: divisor must be positive");
  }
  const product = a * b;
  if (!Number.isSafeInteger(product)) {
    throw new AppError(
      "INTERNAL",
      "mulDivRound: product is not a safe integer",
    );
  }
  return Math.floor((product + Math.floor(d / 2)) / d);
}

export function percentOfBp(minor: number, bp: number): number {
  return mulDivRound(minor, bp, 10_000);
}

export function allocateProportional(
  total: number,
  weights: number[],
): number[] {
  if (weights.length === 0) return [];

  let sum = 0;
  for (const weight of weights) {
    if (!Number.isSafeInteger(weight) || weight < 0) {
      throw new AppError(
        "INTERNAL",
        "allocateProportional: weights must be non-negative safe integers",
      );
    }
    sum += weight;
  }
  if (sum === 0) return weights.map(() => 0);

  const parts: number[] = [];
  let previous = 0;
  let cumulative = 0;
  for (let i = 0; i < weights.length; i += 1) {
    cumulative += weights[i];
    const allocated =
      i === weights.length - 1 ? total : mulDivRound(total, cumulative, sum);
    parts.push(allocated - previous);
    previous = allocated;
  }
  return parts;
}

export function allocateByBp(total: number, bps: number[]): number[] {
  const sum = bps.reduce((acc, bp) => acc + bp, 0);
  if (sum !== 10_000) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Basis points must sum to exactly 10000",
    );
  }
  return allocateProportional(total, bps);
}
