import type { Locale } from "@/lib/constants";
import { AppError } from "@/lib/errors";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function nowMs(): number {
  return Date.now();
}

export function isValidDateStr(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

type DateParts = { year: number; month: number; day: number };

function parseDateStr(dateStr: string): DateParts {
  const match = DATE_PATTERN.exec(dateStr);
  if (!match || !isValidDateStr(dateStr)) {
    throw new AppError("VALIDATION_FAILED", `Invalid date: ${dateStr}`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function utcMs(parts: DateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function toDateStr(ms: number): string {
  const date = new Date(ms);
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, n: number): string {
  const parts = parseDateStr(dateStr);
  return toDateStr(Date.UTC(parts.year, parts.month - 1, parts.day + n));
}

export function todayInTz(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs()));
}

export function compareDateStr(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (utcMs(parseDateStr(b)) - utcMs(parseDateStr(a))) / MS_PER_DAY,
  );
}

export function formatDateLong(dateStr: string, lang: Locale): string {
  const parts = parseDateStr(dateStr);
  const locale = lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

export function formatInstant(
  ms: number,
  tz: string,
  lang: Locale,
  mode: "tz" | "utc" = "tz",
): string {
  const locale = lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    timeZone: mode === "utc" ? "UTC" : tz,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date(ms));
}
