import { describe, expect, it } from "vitest";
import { SAMPLE_SNAPSHOT } from "./sample-snapshot";
import {
  ALLOWED_VARIABLES,
  buildVariableMap,
  FEE_VARIABLES,
  isAllowedVariable,
} from "./variables";
import type { ContractSnapshotV1 } from "./variables";

describe("ALLOWED_VARIABLES", () => {
  it("has 40 unique keys and a fee subset", () => {
    expect(ALLOWED_VARIABLES.length).toBe(40);
    expect(new Set(ALLOWED_VARIABLES).size).toBe(40);
    for (const key of FEE_VARIABLES) {
      expect(ALLOWED_VARIABLES).toContain(key);
    }
    expect(isAllowedVariable("contract.total")).toBe(true);
    expect(isAllowedVariable("contract.unknown")).toBe(false);
    expect(isAllowedVariable("block.signatures")).toBe(false);
  });
});

describe("buildVariableMap", () => {
  it("resolves every whitelisted key in both languages (worked example)", () => {
    for (const lang of ["ar", "en"] as const) {
      const map = buildVariableMap(SAMPLE_SNAPSHOT, lang);
      expect(Object.keys(map).sort()).toEqual([...ALLOWED_VARIABLES].sort());
      for (const key of ALLOWED_VARIABLES) {
        expect(map[key], `${lang} ${key}`).not.toBe("");
      }
    }
  });

  it("formats money and dates per 11.3", () => {
    const en = buildVariableMap(SAMPLE_SNAPSHOT, "en");
    const ar = buildVariableMap(SAMPLE_SNAPSHOT, "ar");
    expect(en["contract.total"]).toBe("21,850.00 SAR");
    expect(ar["contract.total"]).toBe("21,850.00 SAR");
    expect(en["contract.tax"]).toBe("2,850.00 SAR");
    expect(en["contract.tax_rate"]).toBe("15%");
    expect(en["contract.date"]).toBe("20 October 2026");
    expect(ar["contract.date"]).toContain("أكتوبر");
    expect(ar["contract.date"]).toContain("2026");
    expect(en["project.code"]).toBe("P-0001");
    expect(en["contract.version"]).toBe("1");
    expect(en["contract.payment_terms_days"]).toBe("14");
  });

  it("formats a fractional tax rate with trimmed zeros", () => {
    const snapshot: ContractSnapshotV1 = {
      ...SAMPLE_SNAPSHOT,
      totals: { ...SAMPLE_SNAPSHOT.totals, taxRateBp: 1250 },
    };
    expect(buildVariableMap(snapshot, "en")["contract.tax_rate"]).toBe("12.5%");
  });

  it("does not fall back across languages", () => {
    const snapshot: ContractSnapshotV1 = {
      ...SAMPLE_SNAPSHOT,
      client: { ...SAMPLE_SNAPSHOT.client, nameAr: "عميل", nameEn: null },
    };
    expect(buildVariableMap(snapshot, "ar")["client.name"]).toBe("عميل");
    expect(buildVariableMap(snapshot, "en")["client.name"]).toBe("");
  });

  it("falls back legal_name to name within the same language", () => {
    const map = buildVariableMap(SAMPLE_SNAPSHOT, "en");
    expect(map["client.legal_name"]).toBe("Al-Noor Trading Co.");
    expect(map["provider.legal_name"]).toBe("RED SHADOWS | RS");
  });
});
