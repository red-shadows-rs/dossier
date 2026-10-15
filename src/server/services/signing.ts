// Dossier - Signing Service
// https://github.com/red-shadows-rs/dossier

import { randomInt } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, withTx } from "@/db";
import {
  auditLog,
  clients,
  contractSignatories,
  contracts,
  users,
} from "@/db/schema";
import { hmacToken, safeEqualHex, sha256Hex } from "@/lib/crypto";
import { nowMs } from "@/lib/dates";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import type { Locale } from "@/lib/constants";
import type { RequestMeta } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
import {
  finalizeContractTx,
  generateSealedPdf,
} from "@/server/services/contract-finalize";
import { enqueueEmail } from "@/server/services/email";
import { saveFile } from "@/server/services/files";
import { getSettings } from "@/server/services/settings";
import {
  validateSignature,
  type ClientSignInput,
} from "@/lib/validation/signing";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_VERIFIED_TTL_MS = 60 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_SENDS_PER_HOUR = 5;
const MAX_SIGNATURE_BYTES = 200 * 1024;

const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 60;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function assertSigningRateLimit(ip: string | null): void {
  const key = ip ?? "unknown";
  const now = nowMs();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return;
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT) {
    throw new AppError("RATE_LIMITED", "Too many requests");
  }
}

export function resetSigningRateLimits(): void {
  rateBuckets.clear();
}

export type SigningLanguageMode = "ar" | "en";

export type SigningContext = {
  contractId: string;
  signatoryId: string;
  signatoryName: string;
  number: string | null;
  titleAr: string | null;
  titleEn: string | null;
  languageMode: SigningLanguageMode;
  requiresOtp: boolean;
  otpVerified: boolean;
  otpExpiresAt: number | null;
  expiresAt: number | null;
  consentTextAr: string;
  consentTextEn: string;
};

type Resolved = {
  signatory: typeof contractSignatories.$inferSelect;
  contract: typeof contracts.$inferSelect;
};

function invalid(): AppError {
  return new AppError("TOKEN_INVALID", "This link is invalid or has expired");
}

export function resolveSignatory(rawToken: string): Resolved {
  const tokenHash = hmacToken(rawToken, env.APP_SECRET);
  const signatory = db
    .select()
    .from(contractSignatories)
    .where(eq(contractSignatories.tokenHash, tokenHash))
    .get();
  if (!signatory || signatory.role !== "client") throw invalid();

  const contract = db
    .select()
    .from(contracts)
    .where(eq(contracts.id, signatory.contractId))
    .get();
  if (!contract) throw invalid();

  const now = nowMs();
  if (
    signatory.status !== "pending" ||
    signatory.tokenExpiresAt === null ||
    signatory.tokenExpiresAt <= now ||
    contract.status !== "sent" ||
    signatory.versionId !== contract.currentVersionId
  ) {
    throw invalid();
  }
  return { signatory, contract };
}

function otpIsVerified(signatory: typeof contractSignatories.$inferSelect): boolean {
  return (
    signatory.otpVerifiedAt !== null &&
    nowMs() - signatory.otpVerifiedAt < OTP_VERIFIED_TTL_MS
  );
}

function localeForContract(contractId: string, mode: string): Locale {
  if (mode === "ar") return "ar";
  if (mode === "en") return "en";
  const contract = db
    .select({ clientId: contracts.clientId })
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .get();
  const client = contract
    ? db
        .select({ preferredLanguage: clients.preferredLanguage })
        .from(clients)
        .where(eq(clients.id, contract.clientId))
        .get()
    : null;
  return client?.preferredLanguage ?? "ar";
}

export function getSigningContext(
  rawToken: string,
  meta: RequestMeta,
): SigningContext {
  const { signatory, contract } = resolveSignatory(rawToken);
  if (signatory.viewedAt === null) {
    const now = nowMs();
    withTx((tx) => {
      tx.update(contractSignatories)
        .set({ viewedAt: now })
        .where(eq(contractSignatories.id, signatory.id))
        .run();
      audit(tx, {
        actorType: "signer",
        actorId: signatory.id,
        action: "contract.viewed",
        entityType: "contract",
        entityId: contract.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
  }
  const signing = getSettings("signing");
  return {
    contractId: contract.id,
    signatoryId: signatory.id,
    signatoryName: signatory.name,
    number: contract.number,
    titleAr: contract.titleAr,
    titleEn: contract.titleEn,
    languageMode: contract.languageMode,
    requiresOtp: signing.requireEmailOtp,
    otpVerified: otpIsVerified(signatory),
    otpExpiresAt: signatory.otpExpiresAt,
    expiresAt: signatory.tokenExpiresAt,
    consentTextAr: signing.consentTextAr,
    consentTextEn: signing.consentTextEn,
  };
}

export function requestSigningOtp(
  rawToken: string,
  meta: RequestMeta,
): { expiresAt: number } {
  const { signatory, contract } = resolveSignatory(rawToken);
  const signing = getSettings("signing");
  if (!signing.requireEmailOtp) {
    throw new AppError("INVALID_STATE", "Email verification is not required");
  }

  const now = nowMs();
  if (
    signatory.otpExpiresAt !== null &&
    signatory.otpExpiresAt - OTP_TTL_MS > now - OTP_RESEND_COOLDOWN_MS
  ) {
    throw new AppError("RATE_LIMITED", "Please wait before requesting again");
  }

  const sentCount =
    db
      .select({ value: sql<number>`count(*)` })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, "contract.otp_sent"),
          eq(auditLog.entityId, signatory.id),
          gte(auditLog.ts, now - 60 * 60 * 1000),
        ),
      )
      .get()?.value ?? 0;
  if (sentCount >= OTP_MAX_SENDS_PER_HOUR) {
    throw new AppError("RATE_LIMITED", "Too many code requests");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const otpHash = hmacToken(code, env.APP_SECRET);
  const expiresAt = now + OTP_TTL_MS;

  withTx((tx) => {
    tx.update(contractSignatories)
      .set({
        otpHash,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
        otpVerifiedAt: null,
      })
      .where(eq(contractSignatories.id, signatory.id))
      .run();
    audit(tx, {
      actorType: "signer",
      actorId: signatory.id,
      action: "contract.otp_sent",
      entityType: "contract",
      entityId: contract.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    if (signatory.email) {
      enqueueEmail(tx, {
        toEmail: signatory.email,
        toName: signatory.name,
        locale: localeForContract(contract.id, contract.languageMode),
        templateKey: "contract_otp",
        payload: {
          otp: code,
          recipientName: signatory.name,
          number: contract.number,
          titleAr: contract.titleAr,
          titleEn: contract.titleEn,
        },
        entityType: "contract",
        entityId: contract.id,
      });
    }
  });

  return { expiresAt };
}

export function verifySigningOtp(
  rawToken: string,
  code: string,
  meta: RequestMeta,
): void {
  const { signatory, contract } = resolveSignatory(rawToken);
  const signing = getSettings("signing");
  if (!signing.requireEmailOtp) {
    throw new AppError("INVALID_STATE", "Email verification is not required");
  }

  const now = nowMs();
  if (
    !signatory.otpHash ||
    signatory.otpExpiresAt === null ||
    signatory.otpExpiresAt <= now
  ) {
    throw new AppError("OTP_EXPIRED", "The code has expired");
  }
  if (signatory.otpAttempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError("OTP_INVALID", "The code is invalid");
  }

  const expected = hmacToken(code, env.APP_SECRET);
  if (!safeEqualHex(expected, signatory.otpHash)) {
    const attempts = signatory.otpAttempts + 1;
    const lock = attempts >= OTP_MAX_ATTEMPTS;
    withTx((tx) => {
      tx.update(contractSignatories)
        .set(
          lock
            ? { otpAttempts: attempts, otpHash: null, otpExpiresAt: null }
            : { otpAttempts: attempts },
        )
        .where(eq(contractSignatories.id, signatory.id))
        .run();
    });
    throw new AppError("OTP_INVALID", "The code is invalid");
  }

  withTx((tx) => {
    tx.update(contractSignatories)
      .set({ otpVerifiedAt: now, otpAttempts: 0, otpHash: null })
      .where(eq(contractSignatories.id, signatory.id))
      .run();
    audit(tx, {
      actorType: "signer",
      actorId: signatory.id,
      action: "contract.otp_verified",
      entityType: "contract",
      entityId: contract.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

function decodeSignaturePng(dataUrl: string): Buffer {
  const base64 = dataUrl.slice("data:image/png;base64,".length);
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0 || buffer.length > MAX_SIGNATURE_BYTES) {
    throw new AppError("FILE_REJECTED", "Signature is too large");
  }
  if (
    buffer.length < 4 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47
  ) {
    throw new AppError("FILE_REJECTED", "Signature must be a PNG");
  }
  return buffer;
}

export async function submitClientSignature(
  rawToken: string,
  input: ClientSignInput,
  meta: RequestMeta,
): Promise<{ signed: true; finalized: boolean }> {
  const { signatory, contract } = resolveSignatory(rawToken);
  const signing = getSettings("signing");

  if (signing.requireEmailOtp && !otpIsVerified(signatory)) {
    throw new AppError("OTP_INVALID", "Verify your email first");
  }
  if (!input.consent) {
    throw new AppError("VALIDATION_FAILED", "Consent is required", {
      consent: "errors.required",
    });
  }
  const signatureError = validateSignature(input.signature);
  if (signatureError) {
    throw new AppError("VALIDATION_FAILED", "Invalid signature", {
      signature: signatureError,
    });
  }

  let signatureFileId: string | null = null;
  let typedName: string | null = null;
  if (input.signature.method === "drawn" && input.signature.dataUrl) {
    const buffer = decodeSignaturePng(input.signature.dataUrl);
    signatureFileId = saveFile({
      kind: "signature",
      buffer,
      ownerType: "contract",
      ownerId: contract.id,
    }).id;
  } else {
    typedName = input.signature.typedName ?? "";
  }

  const now = nowMs();
  const consent = sha256Hex(input.consentText.normalize("NFC"));

  const finalized = withTx((tx) => {
    const current = tx
      .select()
      .from(contractSignatories)
      .where(eq(contractSignatories.id, signatory.id))
      .get();
    if (!current || current.status !== "pending") throw invalid();

    tx.update(contractSignatories)
      .set({
        status: "signed",
        signedAt: now,
        signatureMethod: input.signature.method,
        signatureFileId,
        typedName,
        consentTextHash: consent,
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
      .where(eq(contractSignatories.id, signatory.id))
      .run();

    audit(tx, {
      actorType: "signer",
      actorId: signatory.id,
      action: "contract.signed",
      entityType: "contract",
      entityId: contract.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return finalizeContractTx(tx, contract.id, now);
  });

  if (finalized) {
    await generateSealedPdf(contract.id);
  }

  return { signed: true, finalized };
}

export function declineContract(
  rawToken: string,
  reason: string | undefined,
  meta: RequestMeta,
): void {
  const { signatory, contract } = resolveSignatory(rawToken);
  const now = nowMs();

  const creator = contract.createdBy
    ? db
        .select({ email: users.email, name: users.name, locale: users.locale })
        .from(users)
        .where(eq(users.id, contract.createdBy))
        .get()
    : null;

  withTx((tx) => {
    tx.update(contractSignatories)
      .set({
        status: "declined",
        declinedAt: now,
        declineReason: reason ?? null,
        tokenHash: null,
        tokenExpiresAt: null,
        otpHash: null,
        otpExpiresAt: null,
      })
      .where(eq(contractSignatories.id, signatory.id))
      .run();

    tx.update(contracts)
      .set({ status: "declined", updatedAt: now })
      .where(eq(contracts.id, contract.id))
      .run();

    audit(tx, {
      actorType: "signer",
      actorId: signatory.id,
      action: "contract.declined",
      entityType: "contract",
      entityId: contract.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    if (creator) {
      enqueueEmail(tx, {
        toEmail: creator.email,
        toName: creator.name,
        locale: creator.locale,
        templateKey: "contract_declined_notice",
        payload: {
          number: contract.number,
          titleAr: contract.titleAr,
          titleEn: contract.titleEn,
          reason: reason ?? null,
          declinedByName: signatory.name,
          recipientName: creator.name,
        },
        entityType: "contract",
        entityId: contract.id,
      });
    }
  });
}
