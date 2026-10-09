import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contractVersions, contracts, invoices } from "@/db/schema";
import type { CurrencyCode, Locale } from "@/lib/constants";
import { sha256Hex } from "@/lib/crypto";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { normalizeCode } from "@/lib/ids";
import { formatMoney } from "@/lib/money";
import type { SellerSnapshot } from "@/server/pdf/html/invoice";
import type { ContractSnapshotV1 } from "@/server/templating/variables";

const LOOKUP_WINDOW_MS = 60 * 1000;
const LOOKUP_LIMIT = 30;
const FILE_WINDOW_MS = 60 * 1000;
const FILE_LIMIT = 10;

const lookupBuckets = new Map<string, { count: number; resetAt: number }>();
const fileBuckets = new Map<string, { count: number; resetAt: number }>();

function hit(
  map: Map<string, { count: number; resetAt: number }>,
  ip: string | null,
  limit: number,
  windowMs: number,
): void {
  const key = ip ?? "unknown";
  const now = nowMs();
  const bucket = map.get(key);
  if (!bucket || bucket.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw new AppError("RATE_LIMITED", "Too many requests");
  }
}

// 7.10 — 30 lookups/minute/IP.
export function assertLookupRateLimit(ip: string | null): void {
  hit(lookupBuckets, ip, LOOKUP_LIMIT, LOOKUP_WINDOW_MS);
}

// 7.10 — 10 file checks/minute/IP.
export function assertFileCheckRateLimit(ip: string | null): void {
  hit(fileBuckets, ip, FILE_LIMIT, FILE_WINDOW_MS);
}

export function resetVerificationRateLimits(): void {
  lookupBuckets.clear();
  fileBuckets.clear();
}

export type ContractVerification = {
  kind: "contract";
  number: string | null;
  titleAr: string | null;
  titleEn: string | null;
  providerName: string | null;
  clientName: string | null;
  signedAt: number | null;
  state: "valid" | "terminated";
  contentHash: string | null;
};

export type InvoiceVerification = {
  kind: "invoice";
  number: string | null;
  issuerName: string | null;
  issueDate: string | null;
  totalFormatted: string;
  state: "valid" | "void";
};

export type VerificationResult = ContractVerification | InvoiceVerification;

function pick(value: { ar?: string | null; en?: string | null }): string | null {
  return value.ar || value.en || null;
}

function contractDto(contractId: string): ContractVerification | null {
  const contract = db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .get();
  if (!contract) return null;

  let providerName: string | null = null;
  let clientName: string | null = null;
  if (contract.currentVersionId) {
    const version = db
      .select()
      .from(contractVersions)
      .where(eq(contractVersions.id, contract.currentVersionId))
      .get();
    if (version) {
      const snapshot = JSON.parse(version.snapshotJson) as ContractSnapshotV1;
      providerName = pick({
        ar: snapshot.provider?.nameAr,
        en: snapshot.provider?.nameEn,
      });
      clientName = pick({
        ar: snapshot.client?.nameAr,
        en: snapshot.client?.nameEn,
      });
    }
  }

  return {
    kind: "contract",
    number: contract.number,
    titleAr: contract.titleAr,
    titleEn: contract.titleEn,
    providerName,
    clientName,
    signedAt: contract.signedAt,
    state: contract.status === "terminated" ? "terminated" : "valid",
    contentHash: contract.contentHash,
  };
}

function invoiceDto(invoiceId: string, locale: Locale): InvoiceVerification | null {
  const invoice = db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .get();
  if (!invoice) return null;

  let issuerName: string | null = null;
  if (invoice.sellerSnapshotJson) {
    const seller = JSON.parse(invoice.sellerSnapshotJson) as SellerSnapshot;
    issuerName = pick({ ar: seller.nameAr, en: seller.nameEn });
  }

  return {
    kind: "invoice",
    number: invoice.number,
    issuerName,
    issueDate: invoice.issueDate,
    totalFormatted: formatMoney(
      invoice.totalMinor,
      invoice.currency as CurrencyCode,
      locale,
    ),
    state: invoice.status === "void" ? "void" : "valid",
  };
}

// 7.10 — resolve a normalized code to a minimal public DTO (or null).
export function lookupVerification(
  rawCode: string,
  locale: Locale = "ar",
): VerificationResult | null {
  const code = normalizeCode(rawCode);
  if (code.length !== 12) return null;

  const contract = db
    .select({ id: contracts.id, status: contracts.status })
    .from(contracts)
    .where(eq(contracts.verificationCode, code))
    .get();
  if (
    contract &&
    (contract.status === "signed" ||
      contract.status === "completed" ||
      contract.status === "terminated")
  ) {
    return contractDto(contract.id);
  }

  const invoice = db
    .select({ id: invoices.id, status: invoices.status })
    .from(invoices)
    .where(eq(invoices.verificationCode, code))
    .get();
  if (invoice && invoice.status !== "draft") {
    return invoiceDto(invoice.id, locale);
  }

  return null;
}

export type PdfCheckResult = "match" | "mismatch" | "unknown";

// 7.10 — compare an uploaded PDF's SHA-256 with the stored sealed hash. The
// upload is never stored. Invoices have no sealed hash, so only contracts match.
export function checkPdfUpload(
  rawCode: string,
  buffer: Buffer,
): PdfCheckResult {
  const code = normalizeCode(rawCode);
  if (code.length !== 12) return "unknown";

  const contract = db
    .select({
      id: contracts.id,
      status: contracts.status,
      pdfSha256: contracts.pdfSha256,
    })
    .from(contracts)
    .where(eq(contracts.verificationCode, code))
    .get();
  if (
    contract &&
    (contract.status === "signed" ||
      contract.status === "completed" ||
      contract.status === "terminated")
  ) {
    if (!contract.pdfSha256) return "unknown";
    return sha256Hex(buffer) === contract.pdfSha256 ? "match" : "mismatch";
  }

  const invoice = db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.verificationCode, code))
    .get();
  if (invoice) return "unknown";

  return "unknown";
}
