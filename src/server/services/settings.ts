// Dossier - Settings Service
// https://github.com/red-shadows-rs/dossier

import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, withTx } from "@/db";
import { settings } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { logger } from "@/lib/logger";
import type { Locale } from "@/lib/constants";
import {
  SETTINGS_SCHEMAS,
  type BankAccount,
  type CompanySettings,
  type SettingsFor,
  type SettingsSection,
} from "@/lib/validation/settings";
import type { RequestMeta, SessionUser } from "@/server/auth/session";
import { audit } from "@/server/services/audit";

function parseStored(valueJson: string | undefined): unknown {
  if (!valueJson) return {};
  try {
    return JSON.parse(valueJson);
  } catch {
    logger.warn("settings_corrupt", { key: "unknown" });
    return {};
  }
}

export function getSettings<S extends SettingsSection>(
  section: S,
): SettingsFor<S> {
  const row = db
    .select({ valueJson: settings.valueJson })
    .from(settings)
    .where(eq(settings.key, section))
    .get();
  return SETTINGS_SCHEMAS[section].parse(
    parseStored(row?.valueJson),
  ) as SettingsFor<S>;
}

function changedKeys(previous: object, next: object): string[] {
  const before = previous as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push(key);
    }
  }
  return changed;
}

export function updateSettings<S extends SettingsSection>(
  section: S,
  value: unknown,
  user: SessionUser,
  meta: RequestMeta,
): SettingsFor<S> {
  const previous = getSettings(section);
  const parsed = SETTINGS_SCHEMAS[section].parse(value) as SettingsFor<S>;
  const changed = changedKeys(previous, parsed);
  const now = nowMs();

  withTx((tx) => {
    tx.insert(settings)
      .values({
        key: section,
        valueJson: JSON.stringify(parsed),
        updatedAt: now,
        updatedBy: user.id,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          valueJson: JSON.stringify(parsed),
          updatedAt: now,
          updatedBy: user.id,
        },
      })
      .run();

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "settings.updated",
      entityType: "settings",
      entityId: section,
      meta: { changedKeys: changed },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });

  return parsed;
}

export function getInternalSetting<S extends z.ZodTypeAny>(
  key: string,
  schema: S,
): z.infer<S> | null {
  const row = db
    .select({ valueJson: settings.valueJson })
    .from(settings)
    .where(eq(settings.key, key))
    .get();
  if (!row) return null;
  const result = schema.safeParse(parseStored(row.valueJson));
  return result.success ? result.data : null;
}

export function setInternalSetting(key: string, value: unknown): void {
  const now = nowMs();
  withTx((tx) => {
    tx.insert(settings)
      .values({ key, valueJson: JSON.stringify(value), updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { valueJson: JSON.stringify(value), updatedAt: now },
      })
      .run();
  });
}

export function getCompanyBankAccounts(company: CompanySettings): BankAccount[] {
  if (company.bankAccounts && company.bankAccounts.length > 0) {
    return company.bankAccounts;
  }
  const bank = company.bank;
  if (bank && (bank.iban || bank.bankNameAr || bank.bankNameEn)) {
    return [
      {
        id: "default-bank",
        provider: "other",
        bankNameAr: bank.bankNameAr,
        bankNameEn: bank.bankNameEn,
        accountHolder: bank.accountHolder,
        iban: bank.iban,
        swift: bank.swift,
        currency: "SAR",
        isActive: true,
        isPrimary: true,
      },
    ];
  }
  return [];
}

export function buildPaymentInstructions(
  company: CompanySettings,
  lang: Locale,
  accountIds?: string[],
): string {
  const allAccounts = company.bankAccounts ?? [];
  const accounts =
    accountIds && accountIds.length > 0
      ? allAccounts.filter((a) => accountIds.includes(a.id))
      : allAccounts.filter((a) => a.isActive);

  if (accounts.length > 0) {
    const metaTag = `<!--dossier:accounts:${accounts.map((a) => a.id).join(",")}-->\n`;
    const lines = accounts
      .map((acc) => {
        const bankName =
          lang === "ar"
            ? acc.bankNameAr || acc.bankNameEn
            : acc.bankNameEn || acc.bankNameAr;

        let idLabel = lang === "ar" ? "الآيبان" : "IBAN";
        if (acc.provider === "paypal") {
          idLabel = lang === "ar" ? "حساب PayPal" : "PayPal Email";
        } else if (acc.provider === "binance") {
          idLabel = lang === "ar" ? "معرف باينانس / المحفظة" : "Binance UID / Wallet";
        } else if (acc.provider === "barq" || acc.provider === "stcpay") {
          idLabel = lang === "ar" ? "رقم المحفظة / الجوال" : "Wallet / Mobile";
        }

        const isBank =
          !acc.provider ||
          acc.provider === "alrajhi" ||
          acc.provider === "snb" ||
          acc.provider === "other";

        const parts: Array<string | null> = [
          bankName ? bankName : null,
          acc.accountHolder
            ? lang === "ar"
              ? `المستفيد: ${acc.accountHolder}`
              : `Beneficiary: ${acc.accountHolder}`
            : null,
          acc.provider === "binance" && acc.binanceUid
            ? `UID: ${acc.binanceUid}`
            : null,
          acc.provider === "binance" && acc.username
            ? lang === "ar"
              ? `المستخدم: ${acc.username}`
              : `User: ${acc.username}`
            : null,
          acc.provider === "paypal" && acc.username
            ? lang === "ar"
              ? `المستخدم: ${acc.username}`
              : `User: ${acc.username}`
            : null,
          acc.provider === "paypal" && acc.paymentUrl
            ? lang === "ar"
              ? `رابط الدفع: ${acc.paymentUrl}`
              : `Pay Link: ${acc.paymentUrl}`
            : null,
          acc.iban
            ? acc.provider === "binance" && acc.network
              ? `${idLabel} (${acc.network}): ${acc.iban}`
              : `${idLabel}: ${acc.iban}`
            : null,
          isBank && acc.swift
            ? lang === "ar"
              ? `سويفت: ${acc.swift}`
              : `SWIFT: ${acc.swift}`
            : null,
        ];
        return parts.filter((part): part is string => part !== null).join(" | ");
      })
      .filter((line) => line.length > 0)
      .join("\n");
    return `${metaTag}${lines}`;
  }

  const bank = company.bank;
  if (!bank.bankNameAr && !bank.bankNameEn && !bank.iban) {
    return "";
  }
  if (lang === "ar") {
    const parts: Array<string | null> = [
      bank.bankNameAr ? `البنك: ${bank.bankNameAr}` : null,
      bank.accountHolder ? `اسم صاحب الحساب: ${bank.accountHolder}` : null,
      bank.iban ? `رقم الآيبان: ${bank.iban}` : null,
      bank.swift ? `سويفت: ${bank.swift}` : null,
    ];
    return parts.filter((part): part is string => part !== null).join(" | ");
  }
  const parts: Array<string | null> = [
    bank.bankNameEn ? `Bank: ${bank.bankNameEn}` : null,
    bank.accountHolder ? `Account holder: ${bank.accountHolder}` : null,
    bank.iban ? `IBAN: ${bank.iban}` : null,
    bank.swift ? `SWIFT: ${bank.swift}` : null,
  ];
  return parts.filter((part): part is string => part !== null).join(" | ");
}

const BANK_LOGO_DATA_URIS: Record<string, string> = {};

export function getBankLogoDataUri(provider: string): string | null {
  if (BANK_LOGO_DATA_URIS[provider]) {
    return BANK_LOGO_DATA_URIS[provider];
  }
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "assets",
      "banks",
      `${provider}.svg`,
    );
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const uri = `data:image/svg+xml;base64,${content.toString("base64")}`;
      BANK_LOGO_DATA_URIS[provider] = uri;
      return uri;
    }
  } catch {
    return null;
  }
  return null;
}
