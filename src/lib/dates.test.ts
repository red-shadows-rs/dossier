// Dossier - Dates Library Tests
// https://github.com/red-shadows-rs/dossier

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  compareDateStr,
  daysBetween,
  formatDateLong,
  formatInstant,
  isValidDateStr,
  nowMs,
  todayInTz,
  utcEndOfDayMs,
  utcStartOfDayMs,
} from "@/lib/dates";

afterEach(() => {
  vi.useRealTimers();
});

describe("addDays", () => {
  it("matches the spec vectors", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("todayInTz", () => {
  it("uses the business timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T21:30:00Z"));
    expect(todayInTz("Asia/Riyadh")).toBe("2026-10-08");
    expect(nowMs()).toBe(Date.parse("2026-10-07T21:30:00Z"));
  });
});

describe("isValidDateStr", () => {
  it("rejects impossible dates", () => {
    expect(isValidDateStr("2026-02-30")).toBe(false);
    expect(isValidDateStr("2026-13-01")).toBe(false);
    expect(isValidDateStr("2026-2-1")).toBe(false);
    expect(isValidDateStr("2026-10-07")).toBe(true);
  });
});

describe("compareDateStr / daysBetween", () => {
  it("compares and counts days", () => {
    expect(compareDateStr("2026-01-01", "2026-01-02")).toBe(-1);
    expect(compareDateStr("2026-01-02", "2026-01-02")).toBe(0);
    expect(compareDateStr("2026-01-03", "2026-01-02")).toBe(1);
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("utcStartOfDayMs / utcEndOfDayMs", () => {
  it("returns the UTC day bounds", () => {
    expect(utcStartOfDayMs("2026-10-07")).toBe(
      Date.UTC(2026, 9, 7, 0, 0, 0, 0),
    );
    expect(utcEndOfDayMs("2026-10-07")).toBe(
      Date.UTC(2026, 9, 7, 23, 59, 59, 999),
    );
  });

  it("rejects invalid dates", () => {
    expect(() => utcStartOfDayMs("2026-02-30")).toThrow();
    expect(() => utcEndOfDayMs("nope")).toThrow();
  });
});

describe("formatDateLong", () => {
  it("formats English", () => {
    expect(formatDateLong("2026-10-07", "en")).toBe("7 October 2026");
  });

  it("formats Arabic with Latin digits", () => {
    const formatted = formatDateLong("2026-10-07", "ar");
    expect(formatted).toContain("7");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("أكتوبر");
  });
});

describe("formatInstant", () => {
  it("formats in the business timezone and in UTC", () => {
    const ms = Date.parse("2026-10-07T12:00:00Z");
    expect(formatInstant(ms, "Asia/Riyadh", "en")).toContain("2026");
    expect(formatInstant(ms, "Asia/Riyadh", "en", "utc")).toContain("UTC");
  });
});
