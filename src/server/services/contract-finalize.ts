import { and, eq, isNull, lt } from "drizzle-orm";
import { db, withTx, type DbTx } from "@/db";
import {
  clients,
  contractSignatories,
  contractVersions,
  contracts,
  users,
} from "@/db/schema";
import { canonicalize } from "@/lib/canonical-json";
import { sha256Hex } from "@/lib/crypto";
import { nowMs } from "@/lib/dates";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { generateCode } from "@/lib/ids";
import { logger } from "@/lib/logger";
import type { Locale } from "@/lib/constants";
import { getFontCss } from "@/server/pdf/fonts";
import { renderContractHtml } from "@/server/pdf/html/contract";
import type { SignatureRender } from "@/server/pdf/html/shared";
import type {
  CertificateData,
  CertificateSignatory,
} from "@/server/pdf/html/certificate";
import { makeQrDataUri, verificationUrl } from "@/server/pdf/qr";
import { renderPdf, type FooterMeta } from "@/server/pdf/render";
import { audit } from "@/server/services/audit";
import { enqueueEmail } from "@/server/services/email";
import { findFileBySha256, readFile, saveFile } from "@/server/services/files";
import { getSettings } from "@/server/services/settings";
import type { ContractSnapshotV1 } from "@/server/templating/variables";

export const MAX_PDF_ATTEMPTS = 10;

export type ContractRow = typeof contracts.$inferSelect;
type SignatoryRow = typeof contractSignatories.$inferSelect;

function uniqueVerificationCode(tx: DbTx): string {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    const clash = tx
      .select({ id: contracts.id })
      .from(contracts)
      .where(eq(contracts.verificationCode, code))
      .get();
    if (!clash) return code;
  }
  throw new AppError("INTERNAL", "Failed to generate a unique code");
}

export function finalizeContractTx(
  tx: DbTx,
  contractId: string,
  now: number,
): boolean {
  const contract = tx
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .get();
  if (!contract || contract.status !== "sent") return false;

  const signatories = tx
    .select()
    .from(contractSignatories)
    .where(
      contract.currentVersionId
        ? and(
            eq(contractSignatories.contractId, contractId),
            eq(contractSignatories.versionId, contract.currentVersionId),
          )
        : eq(contractSignatories.contractId, contractId),
    )
    .all();
  if (signatories.length === 0) return false;
  if (!signatories.every((row) => row.status === "signed")) return false;

  if (!contract.currentVersionId) {
    throw new AppError("INTERNAL", "Contract has no current version");
  }
  const version = tx
    .select()
    .from(contractVersions)
    .where(eq(contractVersions.id, contract.currentVersionId))
    .get();
  if (!version) {
    throw new AppError("INTERNAL", "Contract version not found");
  }
  const expected = sha256Hex(canonicalize(JSON.parse(version.snapshotJson)));
  if (!contract.contentHash || expected !== contract.contentHash) {
    throw new AppError("INTERNAL", "Contract integrity check failed");
  }

  const code = contract.verificationCode ?? uniqueVerificationCode(tx);

  tx.update(contracts)
    .set({
      status: "signed",
      signedAt: now,
      verificationCode: code,
      updatedAt: now,
    })
    .where(eq(contracts.id, contractId))
    .run();

  tx.update(contractSignatories)
    .set({
      tokenHash: null,
      tokenExpiresAt: null,
      otpHash: null,
      otpExpiresAt: null,
    })
    .where(eq(contractSignatories.contractId, contractId))
    .run();

  audit(tx, {
    actorType: "system",
    action: "contract.finalized",
    entityType: "contract",
    entityId: contractId,
    meta: { versionId: contract.currentVersionId },
  });

  return true;
}

function fileDataUri(fileId: string | null): string | null {
  if (!fileId) return null;
  try {
    const file = readFile(fileId);
    return `data:${file.mime};base64,${file.buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function imageBySha(sha256: string | null): string | null {
  if (!sha256) return null;
  const row = findFileBySha256(sha256);
  if (!row) return null;
  return fileDataUri(row.id);
}

function localeForContract(contract: ContractRow): Locale {
  if (contract.languageMode === "ar") return "ar";
  if (contract.languageMode === "en") return "en";
  const client = db
    .select({ preferredLanguage: clients.preferredLanguage })
    .from(clients)
    .where(eq(clients.id, contract.clientId))
    .get();
  return client?.preferredLanguage ?? "ar";
}

function userLocale(userId: string | null, fallback: Locale): Locale {
  if (!userId) return fallback;
  const row = db
    .select({ locale: users.locale })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  return row?.locale ?? fallback;
}

function toSignatureRender(sig: SignatoryRow): SignatureRender {
  return {
    role: sig.role,
    name: sig.name,
    title: sig.title,
    signedAtMs: sig.signedAt,
    method: sig.signatureMethod,
    imageDataUri: fileDataUri(sig.signatureFileId),
    typedName: sig.typedName,
  };
}

function toCertificateSignatory(sig: SignatoryRow): CertificateSignatory {
  return {
    role: sig.role,
    name: sig.name,
    title: sig.title,
    email: sig.email,
    method: sig.signatureMethod,
    signedAtMs: sig.signedAt,
    ip: sig.ip,
    otpVerified: sig.otpVerifiedAt !== null,
    userAgent: sig.userAgent,
  };
}

async function buildSealedHtml(
  contract: ContractRow,
  versionJson: string,
  signatories: SignatoryRow[],
): Promise<{ html: string; code: string }> {
  const code = contract.verificationCode;
  if (!code) throw new AppError("INTERNAL", "Contract has no verification code");

  const snapshot = JSON.parse(versionJson) as ContractSnapshotV1;
  const url = verificationUrl(env.APP_URL, code);
  const qrDataUri = await makeQrDataUri(url);
  const defaults = getSettings("defaults");

  const certificate: CertificateData = {
    contentHash: contract.contentHash ?? "",
    generatedAtMs: nowMs(),
    timezone: defaults.timezone,
    signatories: signatories.map(toCertificateSignatory),
  };

  const html = renderContractHtml({
    snapshot,
    lang: contract.languageMode,
    mode: "sealed",
    fonts: getFontCss(),
    logoDataUri: imageBySha(snapshot.provider.logoSha256),
    stampDataUri: imageBySha(snapshot.provider.stampSha256),
    signatures: signatories.map(toSignatureRender),
    verification: { code, url, qrDataUri },
    certificate,
  });

  return { html, code };
}

function enqueueSignedCopyEmails(
  tx: DbTx,
  contract: ContractRow,
  pdfFileId: string,
  code: string,
): void {
  const url = verificationUrl(env.APP_URL, code);
  const base = {
    number: contract.number,
    titleAr: contract.titleAr,
    titleEn: contract.titleEn,
    code,
    url,
    attachmentFileIds: [pdfFileId],
  };

  const clientSignatory = tx
    .select()
    .from(contractSignatories)
    .where(
      contract.currentVersionId
        ? and(
            eq(contractSignatories.contractId, contract.id),
            eq(contractSignatories.role, "client"),
            eq(contractSignatories.versionId, contract.currentVersionId),
          )
        : and(
            eq(contractSignatories.contractId, contract.id),
            eq(contractSignatories.role, "client"),
          ),
    )
    .get();
  const providerSignatory = tx
    .select()
    .from(contractSignatories)
    .where(
      contract.currentVersionId
        ? and(
            eq(contractSignatories.contractId, contract.id),
            eq(contractSignatories.role, "provider"),
            eq(contractSignatories.versionId, contract.currentVersionId),
          )
        : and(
            eq(contractSignatories.contractId, contract.id),
            eq(contractSignatories.role, "provider"),
          ),
    )
    .get();

  if (clientSignatory?.email) {
    enqueueEmail(tx, {
      toEmail: clientSignatory.email,
      toName: clientSignatory.name,
      locale: localeForContract(contract),
      templateKey: "contract_signed_copy",
      payload: { ...base, recipientName: clientSignatory.name },
      entityType: "contract",
      entityId: contract.id,
    });
  }

  if (providerSignatory?.email) {
    enqueueEmail(tx, {
      toEmail: providerSignatory.email,
      toName: providerSignatory.name,
      locale: userLocale(providerSignatory.signerUserId, localeForContract(contract)),
      templateKey: "contract_signed_copy",
      payload: { ...base, recipientName: providerSignatory.name },
      entityType: "contract",
      entityId: contract.id,
    });
  }

  if (contract.createdBy) {
    const creator = tx
      .select({ email: users.email, name: users.name, locale: users.locale })
      .from(users)
      .where(eq(users.id, contract.createdBy))
      .get();
    if (creator) {
      enqueueEmail(tx, {
        toEmail: creator.email,
        toName: creator.name,
        locale: creator.locale,
        templateKey: "contract_signed_copy",
        payload: { ...base, recipientName: creator.name },
        entityType: "contract",
        entityId: contract.id,
      });
    }
  }
}

export type SealedPdfOptions = {
  render?: (html: string, footer: FooterMeta) => Promise<Buffer>;
};

function recordPdfFailure(contractId: string): number {
  const now = nowMs();
  return withTx((tx) => {
    const contract = tx
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .get();
    if (!contract) return 0;
    const attempts = contract.pdfAttempts + 1;
    tx.update(contracts)
      .set({ pdfAttempts: attempts, updatedAt: now })
      .where(eq(contracts.id, contractId))
      .run();
    if (attempts >= MAX_PDF_ATTEMPTS) {
      audit(tx, {
        actorType: "system",
        action: "contract.pdf_failed",
        entityType: "contract",
        entityId: contractId,
        meta: { attempts },
      });
    }
    return attempts;
  });
}

export async function generateSealedPdf(
  contractId: string,
  options: SealedPdfOptions = {},
): Promise<void> {
  const render = options.render ?? renderPdf;
  try {
    const contract = db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .get();
    if (!contract) throw new AppError("NOT_FOUND", "Contract not found");
    if (contract.status !== "signed" && contract.status !== "completed") {
      return;
    }
    if (contract.finalPdfFileId) return;
    if (!contract.currentVersionId || !contract.verificationCode) {
      throw new AppError("INTERNAL", "Contract is not finalized");
    }

    const version = db
      .select()
      .from(contractVersions)
      .where(eq(contractVersions.id, contract.currentVersionId))
      .get();
    if (!version) throw new AppError("INTERNAL", "Contract version not found");

    const signatories = db
      .select()
      .from(contractSignatories)
      .where(
        contract.currentVersionId
          ? and(
              eq(contractSignatories.contractId, contractId),
              eq(contractSignatories.versionId, contract.currentVersionId),
            )
          : eq(contractSignatories.contractId, contractId),
      )
      .all();

    const { html, code } = await buildSealedHtml(
      contract,
      version.snapshotJson,
      signatories,
    );
    const buffer = await render(html, {
      docNumber: contract.number ?? "DRAFT",
      code,
    });

    const file = saveFile({
      kind: "contract_pdf",
      buffer,
      originalName: `${contract.number ?? "contract"}.pdf`,
      ownerType: "contract",
      ownerId: contractId,
    });
    const pdfSha256 = sha256Hex(buffer);

    withTx((tx) => {
      tx.update(contracts)
        .set({ finalPdfFileId: file.id, pdfSha256, updatedAt: nowMs() })
        .where(eq(contracts.id, contractId))
        .run();
      audit(tx, {
        actorType: "system",
        action: "contract.finalized",
        entityType: "contract",
        entityId: contractId,
        meta: { fileId: file.id, pdfSha256 },
      });
      enqueueSignedCopyEmails(tx, contract, file.id, code);
    });
  } catch (error) {
    const attempts = recordPdfFailure(contractId);
    logger.error("sealed_pdf_failed", {
      contractId,
      attempts,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function retryPendingFinalizations(): Promise<number> {
  const rows = db
    .select({ id: contracts.id })
    .from(contracts)
    .where(
      and(
        eq(contracts.status, "signed"),
        isNull(contracts.finalPdfFileId),
        lt(contracts.pdfAttempts, MAX_PDF_ATTEMPTS),
      ),
    )
    .all();

  for (const row of rows) {
    await generateSealedPdf(row.id);
  }
  return rows.length;
}
