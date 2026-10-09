import { and, asc, eq } from "drizzle-orm";
import { db, withTx } from "@/db";
import {
  contractSignatories,
  contractVersions,
  contracts,
  users,
} from "@/db/schema";
import { canonicalize } from "@/lib/canonical-json";
import { hmacToken, sha256Hex } from "@/lib/crypto";
import { nowMs, todayInTz, utcEndOfDayMs } from "@/lib/dates";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { newId, newToken } from "@/lib/ids";
import type { SessionUser, RequestMeta } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
import { enqueueEmail } from "@/server/services/email";
import { saveFile } from "@/server/services/files";
import { allocateNumber, formatDocNumber } from "@/server/services/numbering";
import { getSettings } from "@/server/services/settings";
import { buildContractSnapshot } from "@/server/services/contract-snapshot";
import { getContract } from "@/server/services/contracts";
import { validateContractForSend } from "@/server/services/contracts-validate";
import {
  validateSignature,
  type SendContractInput,
  type SignAsProviderInput,
} from "@/lib/validation/signing";

const MAX_SIGNATURE_BYTES = 200 * 1024;

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

function storeSignatureFile(
  userId: string,
  contractId: string,
  dataUrl: string,
): string {
  // File I/O happens outside any transaction (R12).
  const buffer = decodeSignaturePng(dataUrl);
  const saved = saveFile({
    kind: "signature",
    buffer,
    ownerType: "contract",
    ownerId: contractId,
    createdBy: userId,
  });
  return saved.id;
}

function tokenExpiryMs(
  now: number,
  linkTtlDays: number,
  signingDeadline: string | null,
): number {
  const byTtl = now + linkTtlDays * 24 * 60 * 60 * 1000;
  if (!signingDeadline) return byTtl;
  return Math.min(byTtl, utcEndOfDayMs(signingDeadline));
}

function resolveSigner(userId: string): typeof users.$inferSelect {
  const row = db.select().from(users).where(eq(users.id, userId)).get();
  if (!row || row.status !== "active" || !row.canSignForCompany) {
    throw new AppError("VALIDATION_FAILED", "Select a valid company signer", {
      providerSignerUserId: "errors.invalid",
    });
  }
  return row;
}

function consentHash(text: string): string {
  return sha256Hex(text.normalize("NFC"));
}

// 7.4 draft → sent. Reads/validation happen before the transaction; all writes
// are one transaction so a failure rolls back everything.
export function sendContract(
  user: SessionUser,
  contractId: string,
  input: SendContractInput,
  meta: RequestMeta,
): { clientToken: string } {
  const settings = getSettings("signing");
  const defaults = getSettings("defaults");
  const numbering = getSettings("numbering");
  const contract = getContract(contractId);
  if (contract.status !== "draft") {
    throw new AppError("INVALID_STATE", "Only drafts can be sent");
  }

  const issues = validateContractForSend(contractId, input);
  if (issues.some((issue) => issue.severity === "error")) {
    throw new AppError("VALIDATION_FAILED", "Fix the validation errors first", {
      _general:
        issues.find((issue) => issue.severity === "error")?.messageKey ??
        "errors.invalid",
    });
  }

  const signer = resolveSigner(input.providerSignerUserId);

  const needsProviderSignature = settings.requireProviderSignatureBeforeSend;
  let signatureFileId: string | null = null;
  let signatureMethod: "drawn" | "typed" | null = null;
  let typedName: string | null = null;
  if (needsProviderSignature) {
    if (!input.signature) {
      throw new AppError(
        "VALIDATION_FAILED",
        "A provider signature is required",
        {
          signature: "errors.required",
        },
      );
    }
    const signatureError = validateSignature(input.signature);
    if (signatureError) {
      throw new AppError("VALIDATION_FAILED", "Invalid signature", {
        signature: signatureError,
      });
    }
    if (!input.consent) {
      throw new AppError("VALIDATION_FAILED", "Consent is required", {
        consent: "errors.required",
      });
    }
    signatureMethod = input.signature.method;
    if (input.signature.method === "drawn" && input.signature.dataUrl) {
      signatureFileId = storeSignatureFile(
        user.id,
        contractId,
        input.signature.dataUrl,
      );
    } else {
      typedName = input.signature.typedName ?? "";
    }
  }

  const now = nowMs();
  const year = Number(todayInTz(defaults.timezone).slice(0, 4));
  const consent = consentHash(input.consentText);
  const clientToken = newToken();
  const tokenHash = hmacToken(clientToken, env.APP_SECRET);
  const expiresAt = tokenExpiryMs(
    now,
    settings.linkTtlDays,
    contract.signingDeadline,
  );

  const result = withTx((tx) => {
    const current = tx
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .get();
    if (!current || current.status !== "draft") {
      throw new AppError("INVALID_STATE", "Only drafts can be sent");
    }

    let number = current.number;
    if (number === null) {
      const seq = allocateNumber(tx, "contract", year);
      number = formatDocNumber(numbering.prefix, "C", year, seq);
    }

    const providerTitle =
      input.providerTitle ??
      (current.languageMode === "ar"
        ? signer.signerTitleAr
        : signer.signerTitleEn) ??
      null;

    const providerSignatoryId = newId();
    const clientSignatoryId = newId();

    const snapshot = buildContractSnapshot(contractId, [
      {
        role: "provider",
        name: input.providerName,
        title: providerTitle,
        email: signer.email,
      },
      {
        role: "client",
        name: input.clientSignatoryName,
        title: input.clientSignatoryTitle ?? null,
        email: input.clientSignatoryEmail,
      },
    ]);
    snapshot.contract.number = number;
    const snapshotJson = canonicalize(snapshot);
    const contentHash = sha256Hex(snapshotJson);

    const versionId = newId();
    tx.insert(contractVersions)
      .values({
        id: versionId,
        contractId,
        versionNo: current.versionNo,
        snapshotJson,
        contentHash,
        createdBy: user.id,
        createdAt: now,
      })
      .run();

    tx.update(contracts)
      .set({
        number,
        status: "sent",
        sentAt: now,
        currentVersionId: versionId,
        contentHash,
        verificationCode: current.verificationCode ?? null,
        updatedAt: now,
      })
      .where(eq(contracts.id, contractId))
      .run();

    tx.insert(contractSignatories)
      .values({
        id: providerSignatoryId,
        contractId,
        versionId,
        role: "provider",
        name: input.providerName,
        title: providerTitle,
        email: signer.email,
        signerUserId: signer.id,
        sortOrder: 0,
        status: needsProviderSignature ? "signed" : "pending",
        signedAt: needsProviderSignature ? now : null,
        signatureMethod: needsProviderSignature ? signatureMethod : null,
        signatureFileId: needsProviderSignature ? signatureFileId : null,
        typedName: needsProviderSignature ? typedName : null,
        consentTextHash: needsProviderSignature ? consent : null,
        ip: needsProviderSignature ? meta.ip : null,
        userAgent: needsProviderSignature ? meta.userAgent : null,
        createdAt: now,
      })
      .run();

    tx.insert(contractSignatories)
      .values({
        id: clientSignatoryId,
        contractId,
        versionId,
        role: "client",
        name: input.clientSignatoryName,
        title: input.clientSignatoryTitle ?? null,
        email: input.clientSignatoryEmail,
        sortOrder: 1,
        status: "pending",
        tokenHash,
        tokenExpiresAt: expiresAt,
        otpAttempts: 0,
        createdAt: now,
      })
      .run();

    const linkUrl = `${env.APP_URL}/s/${clientToken}`;
    enqueueEmail(tx, {
      toEmail: input.clientSignatoryEmail,
      toName: input.clientSignatoryName,
      locale:
        current.languageMode === "ar"
          ? "ar"
          : current.languageMode === "en"
            ? "en"
            : "ar",
      templateKey: "contract_signing_link",
      payload: {
        contractId,
        signatoryId: clientSignatoryId,
        number,
        titleAr: current.titleAr,
        titleEn: current.titleEn,
        url: linkUrl,
        token: clientToken,
        expiresAt,
      },
      entityType: "contract",
      entityId: contractId,
    });

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.sent",
      entityType: "contract",
      entityId: contractId,
      meta: { number, versionId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { clientToken };
  });

  return result;
}

export function signAsProvider(
  user: SessionUser,
  contractId: string,
  input: SignAsProviderInput,
  meta: RequestMeta,
): void {
  const signatureError = validateSignature(input.signature);
  if (signatureError) {
    throw new AppError("VALIDATION_FAILED", "Invalid signature", {
      signature: signatureError,
    });
  }
  if (!input.consent) {
    throw new AppError("VALIDATION_FAILED", "Consent is required", {
      consent: "errors.required",
    });
  }

  let signatureFileId: string | null = null;
  let typedName: string | null = null;
  if (input.signature.method === "drawn" && input.signature.dataUrl) {
    signatureFileId = storeSignatureFile(
      user.id,
      contractId,
      input.signature.dataUrl,
    );
  } else {
    typedName = input.signature.typedName ?? "";
  }

  const now = nowMs();
  const consent = consentHash(input.consentText);

  withTx((tx) => {
    const contract = tx
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .get();
    if (!contract) throw new AppError("NOT_FOUND", "Contract not found");
    if (contract.status !== "sent") {
      throw new AppError(
        "INVALID_STATE",
        "The contract is not awaiting signatures",
      );
    }
    const provider = tx
      .select()
      .from(contractSignatories)
      .where(eq(contractSignatories.contractId, contractId))
      .orderBy(asc(contractSignatories.sortOrder))
      .all()
      .find((row) => row.role === "provider");
    if (!provider || provider.status !== "pending") {
      throw new AppError(
        "INVALID_STATE",
        "The provider signatory is not pending",
      );
    }

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
      .where(eq(contractSignatories.id, provider.id))
      .run();

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.signed",
      entityType: "contract",
      entityId: contractId,
      meta: { role: "provider" },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function countContractSignatories(contractId: string): number {
  return db
    .select({ id: contractSignatories.id })
    .from(contractSignatories)
    .where(eq(contractSignatories.contractId, contractId))
    .all().length;
}

export type CompanySigner = {
  id: string;
  name: string;
  titleAr: string | null;
  titleEn: string | null;
};

export function listCompanySigners(): CompanySigner[] {
  return db
    .select({
      id: users.id,
      name: users.name,
      titleAr: users.signerTitleAr,
      titleEn: users.signerTitleEn,
    })
    .from(users)
    .where(and(eq(users.canSignForCompany, true), eq(users.status, "active")))
    .orderBy(asc(users.name))
    .all();
}
