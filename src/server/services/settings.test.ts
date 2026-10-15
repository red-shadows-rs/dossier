import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, settings } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import type { SessionUser } from "@/server/auth/session";
import { createTestUser } from "@/server/auth/test-utils";
import {
  buildPaymentInstructions,
  getInternalSetting,
  getSettings,
  setInternalSetting,
  updateSettings,
} from "./settings";
import { workerHeartbeatSchema } from "@/lib/validation/settings";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

async function sessionUser(): Promise<SessionUser> {
  const created = await createTestUser({ role: "owner" });
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: "owner",
    locale: "ar",
    canSignForCompany: true,
    signerTitleAr: null,
    signerTitleEn: null,
  };
}

describe("getSettings", () => {
  it("returns defaults on a fresh database", () => {
    expect(getSettings("company").nameAr).toBe("");
    expect(getSettings("company").logoFileId).toBeNull();
    expect(getSettings("company").bank.iban).toBe("");

    const defaults = getSettings("defaults");
    expect(defaults.country).toBe("SA");
    expect(defaults.timezone).toBe("Asia/Riyadh");
    expect(defaults.currency).toBe("SAR");
    expect(defaults.taxRateBp).toBe(1500);
    expect(defaults.paymentTermsDays).toBe(14);
    expect(defaults.languageMode).toBe("ar");

    expect(getSettings("numbering").prefix).toBe("DOS");
    expect(getSettings("signing").linkTtlDays).toBe(14);
    expect(getSettings("signing").requireEmailOtp).toBe(true);
    expect(getSettings("email").fromName).toBe("Dossier");
    expect(getSettings("email").overdueReminderDays).toEqual([1, 7, 14]);
  });

  it("falls back to defaults when the stored JSON is corrupt", () => {
    db.insert(settings)
      .values({ key: "numbering", valueJson: "{not json", updatedAt: 0 })
      .run();
    expect(getSettings("numbering").prefix).toBe("DOS");
  });
});

describe("updateSettings", () => {
  it("persists, validates and audits the change", async () => {
    const user = await sessionUser();
    const updated = updateSettings("numbering", { prefix: "RSX" }, user, META);
    expect(updated.prefix).toBe("RSX");
    expect(getSettings("numbering").prefix).toBe("RSX");

    const logs = db.select().from(auditLog).all();
    const entry = logs.find(
      (row) =>
        row.action === "settings.updated" && row.entityId === "numbering",
    );
    expect(entry).toBeDefined();
    expect(entry?.metaJson).toContain("changedKeys");
  });

  it("rejects invalid input", async () => {
    const user = await sessionUser();
    expect(() =>
      updateSettings("numbering", { prefix: "bad-prefix" }, user, META),
    ).toThrow();
    expect(() =>
      updateSettings("defaults", { timezone: "Not/AZone" }, user, META),
    ).toThrow();
  });

  it("upserts the same key without duplicating rows", async () => {
    const user = await sessionUser();
    updateSettings("numbering", { prefix: "AAA" }, user, META);
    updateSettings("numbering", { prefix: "BBB" }, user, META);
    const rows = db
      .select()
      .from(settings)
      .where(eq(settings.key, "numbering"))
      .all();
    expect(rows).toHaveLength(1);
    expect(getSettings("numbering").prefix).toBe("BBB");
  });
});

describe("settings authorization", () => {
  it("viewers cannot read settings", () => {
    try {
      assertCan({ role: "viewer", canSignForCompany: false }, "settings.read");
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("FORBIDDEN");
    }
  });
});

describe("buildPaymentInstructions", () => {
  it("builds English instructions and omits empty parts", () => {
    const company = getSettings("company");
    expect(
      buildPaymentInstructions(
        {
          ...company,
          bank: {
            bankNameAr: "بنك",
            bankNameEn: "Example Bank",
            accountHolder: "RS",
            iban: "SA00",
            swift: "",
          },
        },
        "en",
      ),
    ).toBe("Bank: Example Bank | Account holder: RS | IBAN: SA00");
  });

  it("builds Arabic instructions", () => {
    const company = getSettings("company");
    const text = buildPaymentInstructions(
      {
        ...company,
        bank: {
          bankNameAr: "بنك المثال",
          bankNameEn: "",
          accountHolder: "شركة",
          iban: "",
          swift: "XXXX",
        },
      },
      "ar",
    );
    expect(text).toBe(
      "البنك: بنك المثال | اسم صاحب الحساب: شركة | سويفت: XXXX",
    );
  });
});

describe("internal settings", () => {
  it("stores and reads a worker heartbeat", () => {
    expect(
      getInternalSetting("worker_heartbeat", workerHeartbeatSchema),
    ).toBeNull();
    setInternalSetting("worker_heartbeat", { ts: 123 });
    expect(
      getInternalSetting("worker_heartbeat", workerHeartbeatSchema),
    ).toEqual({
      ts: 123,
    });
  });
});
