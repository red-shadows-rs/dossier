import { describe, expect, it } from "vitest";
import { withTx } from "@/db";
import {
  allocateNumber,
  formatDocNumber,
  formatProjectCode,
} from "./numbering";

describe("formatProjectCode / formatDocNumber", () => {
  it("pads to at least 4 digits and never truncates", () => {
    expect(formatProjectCode(1)).toBe("P-0001");
    expect(formatProjectCode(9999)).toBe("P-9999");
    expect(formatProjectCode(10000)).toBe("P-10000");
  });

  it("formats document numbers per 7.1", () => {
    expect(formatDocNumber("DOS", "C", 2026, 1)).toBe("DOS-C-2026-0001");
    expect(formatDocNumber("DOS", "I", 2026, 10000)).toBe("DOS-I-2026-10000");
    expect(formatDocNumber("RSX", "C", 2027, 42)).toBe("RSX-C-2027-0042");
  });
});

describe("allocateNumber", () => {
  it("allocates sequential project codes (P-0001, P-0002)", () => {
    const first = withTx((tx) => allocateNumber(tx, "project", 0));
    const second = withTx((tx) => allocateNumber(tx, "project", 0));
    expect(formatProjectCode(first)).toBe("P-0001");
    expect(formatProjectCode(second)).toBe("P-0002");
  });

  it("restarts per year per key", () => {
    expect(withTx((tx) => allocateNumber(tx, "contract", 2026))).toBe(1);
    expect(withTx((tx) => allocateNumber(tx, "contract", 2026))).toBe(2);
    expect(withTx((tx) => allocateNumber(tx, "contract", 2027))).toBe(1);
    expect(withTx((tx) => allocateNumber(tx, "invoice", 2026))).toBe(1);
  });

  it("does not consume a number when the transaction rolls back", () => {
    const before = withTx((tx) => allocateNumber(tx, "contract", 2030));
    expect(() =>
      withTx((tx) => {
        allocateNumber(tx, "contract", 2030);
        throw new Error("boom");
      }),
    ).toThrow("boom");
    const after = withTx((tx) => allocateNumber(tx, "contract", 2030));
    expect(after).toBe(before + 1);
  });

  it("never returns the same number for sequential allocations", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 50; i += 1) {
      const n = withTx((tx) => allocateNumber(tx, "invoice", 2040));
      expect(seen.has(n)).toBe(false);
      seen.add(n);
    }
    expect(seen.size).toBe(50);
  });

  it("keeps counting past 9999", () => {
    let last = 0;
    for (let i = 0; i < 10000; i += 1) {
      last = withTx((tx) => allocateNumber(tx, "contract", 2050));
    }
    expect(last).toBe(10000);
    expect(formatDocNumber("DOS", "C", 2050, last)).toBe("DOS-C-2050-10000");
  });
});
