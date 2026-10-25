// Dossier - Payment Methods Utility
// https://github.com/red-shadows-rs/dossier

import { BANK_PROVIDERS, type BankProviderId } from "@/lib/constants";
import type { BankAccount } from "@/lib/validation/settings";

export type PaymentCardData = {
  id?: string;
  provider: string;
  bankName: string;
  accountHolder: string;
  identifierLabel: string;
  identifierValue: string;
  swift?: string | null;
  currency?: string;
  icon?: string | null;
  username?: string;
  paymentUrl?: string;
  binanceUid?: string;
  binancePayId?: string;
  network?: string;
};

export function extractAccountIdsFromInstructions(
  instructions?: string | null,
): string[] {
  if (!instructions) return [];
  const match = instructions.match(/<!--dossier:accounts:([^>]+)-->/);
  if (!match || !match[1]) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function stripPaymentMetadata(instructions?: string | null): string {
  if (!instructions) return "";
  return instructions.replace(/<!--dossier:accounts:[^>]+-->/g, "").trim();
}

function detectProvider(name: string): BankProviderId {
  const lower = name.toLowerCase();
  if (lower.includes("rajhi") || lower.includes("الراجحي")) return "alrajhi";
  if (lower.includes("snb") || lower.includes("الأهلي") || lower.includes("الاهلي")) return "snb";
  if (lower.includes("barq") || lower.includes("برق")) return "barq";
  if (lower.includes("stc") || lower.includes("stcpay")) return "stcpay";
  if (lower.includes("paypal") || lower.includes("بايبال")) return "paypal";
  if (lower.includes("binance") || lower.includes("باينانس")) return "binance";
  return "other";
}

export function formatAccountToCard(
  acc: BankAccount,
  lang: "ar" | "en" = "ar",
): PaymentCardData {
  const bankName =
    lang === "ar"
      ? acc.bankNameAr || acc.bankNameEn || (acc.provider === "other" ? "حساب بنكي" : acc.provider)
      : acc.bankNameEn || acc.bankNameAr || (acc.provider === "other" ? "Bank Account" : acc.provider);

  let identifierLabel = lang === "ar" ? "الآيبان" : "IBAN";
  let identifierValue = acc.iban || "";

  if (acc.provider === "paypal") {
    identifierLabel = lang === "ar" ? "البريد / المعرف" : "Email / Handle";
    identifierValue = acc.iban || acc.username || "";
  } else if (acc.provider === "binance") {
    if (acc.iban) {
      identifierLabel = acc.network
        ? (lang === "ar" ? `المحفظة (${acc.network})` : `Wallet (${acc.network})`)
        : (lang === "ar" ? "عنوان المحفظة" : "Wallet Address");
      identifierValue = acc.iban;
    } else if (acc.binanceUid) {
      identifierLabel = lang === "ar" ? "معرف باينانس (UID)" : "Binance UID";
      identifierValue = acc.binanceUid;
    } else {
      identifierLabel = lang === "ar" ? "معرف باينانس" : "Binance ID";
    }
  } else if (acc.provider === "barq" || acc.provider === "stcpay") {
    identifierLabel = lang === "ar" ? "رقم المحفظة / الجوال" : "Wallet / Mobile";
  }

  const prov = BANK_PROVIDERS.find((p) => p.id === acc.provider);
  const isBank = !prov || prov.type === "bank" || prov.type === "custom";

  return {
    id: acc.id,
    provider: acc.provider,
    bankName,
    accountHolder: acc.accountHolder || "",
    identifierLabel,
    identifierValue,
    swift: isBank ? (acc.swift || null) : null,
    currency: acc.currency,
    icon: prov?.icon ?? null,
    username: acc.username,
    paymentUrl: acc.paymentUrl,
    binanceUid: acc.binanceUid,
    binancePayId: acc.binancePayId,
    network: acc.network,
  };
}

export function parsePaymentInstructionsToCards(
  instructions?: string | null,
  companyAccounts?: BankAccount[],
  lang: "ar" | "en" = "ar",
): PaymentCardData[] {
  if (!instructions) return [];

  const explicitIds = extractAccountIdsFromInstructions(instructions);
  if (explicitIds.length > 0 && companyAccounts && companyAccounts.length > 0) {
    const matched = companyAccounts.filter((a) => explicitIds.includes(a.id));
    if (matched.length > 0) {
      return matched.map((a) => formatAccountToCard(a, lang));
    }
  }

  const clean = stripPaymentMetadata(instructions);
  if (!clean) return [];

  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const cards: PaymentCardData[] = [];

  for (const line of lines) {
    if (companyAccounts && companyAccounts.length > 0) {
      const matched = companyAccounts.find(
        (a) =>
          (a.iban && line.includes(a.iban)) ||
          (a.bankNameAr && line.includes(a.bankNameAr)) ||
          (a.bankNameEn && line.includes(a.bankNameEn)),
      );
      if (matched && !cards.some((c) => c.id === matched.id)) {
        cards.push(formatAccountToCard(matched, lang));
        continue;
      }
    }

    const segments = line.split("|").map((s) => s.trim());
    if (segments.length === 0) continue;

    const rawBankName = segments[0] || (lang === "ar" ? "حساب بنكي" : "Bank Account");
    let bankName = rawBankName;
    if (bankName.includes(":")) {
      bankName = bankName.split(":")[1]?.trim() || bankName;
    }

    const provider = detectProvider(rawBankName);
    const provDef = BANK_PROVIDERS.find((p) => p.id === provider);
    const isBank = !provDef || provDef.type === "bank" || provDef.type === "custom";

    let accountHolder = "";
    let identifierLabel = lang === "ar" ? "الآيبان" : "IBAN";
    let identifierValue = "";
    let swift: string | null = null;
    let binanceUid: string | undefined;
    let binancePayId: string | undefined;
    let paymentUrl: string | undefined;
    let username: string | undefined;
    let network: string | undefined;

    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      if (!seg) continue;

      if (
        seg.includes("المستفيد:") ||
        seg.includes("اسم صاحب الحساب:") ||
        seg.toLowerCase().includes("beneficiary:") ||
        seg.toLowerCase().includes("account holder:")
      ) {
        accountHolder = seg.split(":")[1]?.trim() || "";
      } else if (
        seg.includes("معرف باينانس (UID):") ||
        seg.includes("Binance UID:") ||
        seg.startsWith("UID:") ||
        seg.includes("UID:")
      ) {
        binanceUid = seg.split(":")[1]?.trim() || "";
      } else if (
        seg.includes("معرف الدفع (Pay ID):") ||
        seg.includes("معرف باينانس باي") ||
        seg.includes("Pay ID:") ||
        seg.startsWith("Pay ID:")
      ) {
        binancePayId = seg.split(":")[1]?.trim() || "";
      } else if (
        seg.includes("رابط الدفع:") ||
        seg.toLowerCase().includes("pay link:")
      ) {
        paymentUrl = seg.slice(seg.indexOf(":") + 1).trim();
      } else if (
        seg.includes("المستخدم:") ||
        seg.toLowerCase().includes("user:")
      ) {
        username = seg.split(":")[1]?.trim() || "";
      } else if (
        seg.includes("الآيبان:") ||
        seg.includes("رقم الآيبان:") ||
        seg.toLowerCase().includes("iban:")
      ) {
        identifierLabel = lang === "ar" ? "الآيبان" : "IBAN";
        identifierValue = seg.split(":")[1]?.trim() || "";
      } else if (
        seg.includes("سويفت:") ||
        seg.toLowerCase().includes("swift:")
      ) {
        swift = seg.split(":")[1]?.trim() || null;
      } else if (
        seg.includes("حساب PayPal:") ||
        seg.toLowerCase().includes("paypal email:")
      ) {
        identifierLabel = lang === "ar" ? "حساب PayPal" : "PayPal Email";
        identifierValue = seg.split(":")[1]?.trim() || "";
      } else if (
        seg.includes("المحفظة") ||
        seg.toLowerCase().includes("wallet") ||
        seg.includes("معرف باينانس") ||
        seg.toLowerCase().includes("binance")
      ) {
        const netMatch = seg.match(/\(([^)]+)\)/);
        if (netMatch) network = netMatch[1];
        const val = seg.split(":")[1]?.trim() || "";
        if (val) {
          identifierValue = val;
          identifierLabel = network
            ? (lang === "ar" ? `المحفظة (${network})` : `Wallet (${network})`)
            : (lang === "ar" ? "عنوان المحفظة" : "Wallet Address");
        }
      } else if (
        seg.includes("رقم المحفظة") ||
        seg.includes("رقم الجوال") ||
        seg.toLowerCase().includes("mobile")
      ) {
        identifierLabel = lang === "ar" ? "رقم المحفظة / الجوال" : "Wallet / Mobile";
        identifierValue = seg.split(":")[1]?.trim() || "";
      } else if (!identifierValue && seg.includes(":")) {
        const [label, ...valParts] = seg.split(":");
        identifierLabel = label.trim();
        identifierValue = valParts.join(":").trim();
      }
    }

    if (!identifierValue && binanceUid) {
      identifierLabel = lang === "ar" ? "معرف باينانس (UID)" : "Binance UID";
      identifierValue = binanceUid;
    }

    cards.push({
      provider,
      bankName,
      accountHolder,
      identifierLabel,
      identifierValue,
      swift: isBank ? swift : null,
      icon: provDef?.icon ?? null,
      username,
      paymentUrl,
      binanceUid,
      binancePayId,
      network,
    });
  }

  return cards;
}

