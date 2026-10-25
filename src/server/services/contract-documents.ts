// Dossier - Contract Documents Service
// https://github.com/red-shadows-rs/dossier

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contractSignatories, contractVersions, users } from "@/db/schema";
import { canonicalize } from "@/lib/canonical-json";
import { sha256Hex } from "@/lib/crypto";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import {
  allowedDocLangs,
  defaultDocLang,
  isDocLang,
  type DocLang,
} from "@/lib/doc-lang";
import { env } from "@/lib/env";
import { makeQrDataUri, verificationUrl } from "@/server/pdf/qr";
import {
  renderContractCertificateHtml,
  renderContractHtml,
} from "@/server/pdf/html/contract";
import type { CertificateData } from "@/server/pdf/html/certificate";
import type { SignatureRender } from "@/server/pdf/html/shared";
import { getFontCss } from "@/server/pdf/fonts";
import { findFileBySha256, getFileRow, readFile } from "@/server/services/files";
import { getSettings } from "@/server/services/settings";
import type { ContractSnapshotV1 } from "@/server/templating/variables";
import { buildContractSnapshot } from "./contract-snapshot";
import { getContract, type ContractRow } from "./contracts";

export type ContractDocMode = "draft" | "preview" | "unsigned";

function toDataUri(mime: string, buffer: Buffer): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function imageBySha(sha256: string | null): string | null {
  if (!sha256) return null;
  const row = findFileBySha256(sha256);
  if (!row) return null;
  try {
    const file = readFile(row.id);
    return toDataUri(file.mime, file.buffer);
  } catch {
    return null;
  }
}

function imageByFileId(fileId: string | null): string | null {
  if (!fileId) return null;
  const row = getFileRow(fileId);
  if (!row) return null;
  try {
    const file = readFile(row.id);
    return toDataUri(file.mime, file.buffer);
  } catch {
    return null;
  }
}

export function resolveDocLang(
  contract: ContractRow,
  requested: string | undefined,
): DocLang {
  const lang = requested ?? defaultDocLang(contract.languageMode);
  const allowed = allowedDocLangs(contract.languageMode);
  if (!isDocLang(lang) || !allowed.includes(lang)) {
    throw new AppError("VALIDATION_FAILED", "Language not allowed", {
      lang: "errors.invalid",
    });
  }
  return lang;
}

export function snapshotForRendering(
  contract: ContractRow,
): ContractSnapshotV1 {
  if (contract.status !== "draft" && contract.currentVersionId) {
    const version = db
      .select()
      .from(contractVersions)
      .where(eq(contractVersions.id, contract.currentVersionId))
      .get();
    if (version) {
      return JSON.parse(version.snapshotJson) as ContractSnapshotV1;
    }
  }
  return buildContractSnapshot(contract.id);
}

export async function buildContractHtml(
  contractId: string,
  lang: DocLang,
  mode: ContractDocMode,
): Promise<string> {
  const contract = getContract(contractId);
  const snapshot = snapshotForRendering(contract);
  const company = getSettings("company");
  const logoDataUri =
    imageBySha(snapshot.provider.logoSha256) ??
    imageByFileId(company.logoFileId ?? null);
  const stampDataUri =
    imageBySha(snapshot.provider.stampSha256) ??
    imageByFileId(company.stampFileId ?? null);

  let verification: { code: string; url: string; qrDataUri: string } | null = null;
  const verificationCode =
    contract.verificationCode ??
    contract.number ??
    (contract.status === "draft" || mode === "preview" || mode === "draft" ? "DRAFT-PREVIEW" : null);
  if (verificationCode) {
    const url = verificationUrl(env.APP_URL, verificationCode);
    verification = {
      code: verificationCode,
      url,
      qrDataUri: await makeQrDataUri(url),
    };
  }

  const signatoryRows = contract.currentVersionId
    ? db
        .select()
        .from(contractSignatories)
        .where(
          and(
            eq(contractSignatories.contractId, contractId),
            eq(contractSignatories.versionId, contract.currentVersionId),
          ),
        )
        .orderBy(asc(contractSignatories.sortOrder))
        .all()
    : db
        .select()
        .from(contractSignatories)
        .where(eq(contractSignatories.contractId, contractId))
        .orderBy(asc(contractSignatories.sortOrder))
        .all();

  const isArabic = lang === "ar";
  const isIndividual =
    snapshot.client.type === "individual" || !snapshot.client.repNameAr;

  const defaultProviderName =
    (isArabic ? snapshot.provider.nameAr : snapshot.provider.nameEn) ||
    (isArabic ? "المفوض بالتوقيع" : "Authorized Signatory");

  const defaultClientName =
    (isArabic
      ? snapshot.client.repNameAr || snapshot.client.nameAr
      : snapshot.client.repNameEn || snapshot.client.nameEn) ||
    (isArabic
      ? isIndividual ? "العميل" : "ممثل العميل"
      : isIndividual ? "Client" : "Client Representative");

  const defaultClientTitle =
    (isArabic ? snapshot.client.repTitleAr : snapshot.client.repTitleEn) ||
    (isIndividual
      ? isArabic ? "العميل" : "Client"
      : isArabic ? "ممثل العميل" : "Client Representative");

  const signatures: SignatureRender[] =
    signatoryRows.length > 0
      ? signatoryRows.map((s) => {
          let resolvedTitle = s.title?.trim() || null;
          if (!resolvedTitle && s.signerUserId) {
            const u = db
              .select({
                titleAr: users.signerTitleAr,
                titleEn: users.signerTitleEn,
              })
              .from(users)
              .where(eq(users.id, s.signerUserId))
              .get();
            resolvedTitle = (isArabic ? u?.titleAr : u?.titleEn) || null;
          }
          if (!resolvedTitle) {
            resolvedTitle =
              s.role === "provider"
                ? isArabic
                  ? "المفوض بالتوقيع"
                  : "Authorized Signatory"
                : defaultClientTitle;
          } else if (
            s.role === "client" &&
            isIndividual &&
            (resolvedTitle === "ممثل العميل" || resolvedTitle === "Client Representative")
          ) {
            resolvedTitle = isArabic ? "العميل" : "Client";
          }
          return {
            role: s.role,
            name:
              s.name ||
              (s.role === "provider" ? defaultProviderName : defaultClientName),
            title: resolvedTitle,
            signedAtMs: s.signedAt,
            method: s.signatureMethod,
            imageDataUri: imageByFileId(s.signatureFileId),
            typedName: s.typedName,
          };
        })
      : snapshot.signatories && snapshot.signatories.length > 0
        ? snapshot.signatories.map((s) => ({
            role: s.role,
            name: s.name,
            title:
              s.title?.trim() ||
              (s.role === "provider"
                ? isArabic
                  ? "المفوض بالتوقيع"
                  : "Authorized Signatory"
                : defaultClientTitle),
            signedAtMs: null,
            method: null,
            imageDataUri: null,
            typedName: null,
          }))
        : [
            {
              role: "provider" as const,
              name: defaultProviderName,
              title: isArabic ? "المفوض بالتوقيع" : "Authorized Signatory",
              signedAtMs: null,
              method: null,
              imageDataUri: null,
              typedName: null,
            },
            {
              role: "client" as const,
              name: defaultClientName,
              title: defaultClientTitle,
              signedAtMs: null,
              method: null,
              imageDataUri: null,
              typedName: null,
            },
          ];

  return renderContractHtml({
    snapshot,
    lang,
    mode,
    fonts: getFontCss(),
    logoDataUri,
    stampDataUri,
    signatures,
    verification,
    certificate: null,
  });
}

export function safePdfFilename(
  contract: Pick<ContractRow, "number">,
  lang: DocLang,
): string {
  const base = contract.number ?? "draft";
  const safe = `${base}-${lang}.pdf`.replace(/[^A-Za-z0-9._-]/g, "");
  return safe;
}

export function documentMode(contract: ContractRow): ContractDocMode {
  return contract.status === "draft" ? "draft" : "unsigned";
}

export type ContractPdfSource =
  | { kind: "sealed"; fileId: string; filename: string; lang: DocLang }
  | { kind: "render"; html: string; filename: string; docNumber: string; lang: DocLang };

export async function resolveContractPdf(
  contractId: string,
  requestedLang: string | undefined,
): Promise<ContractPdfSource> {
  const contract = getContract(contractId);
  const lang = resolveDocLang(contract, requestedLang);

  if (
    contract.finalPdfFileId &&
    lang === contract.languageMode &&
    contract.status !== "draft"
  ) {
    return {
      kind: "sealed",
      fileId: contract.finalPdfFileId,
      filename: safePdfFilename(contract, lang),
      lang,
    };
  }

  const html = await buildContractHtml(
    contractId,
    lang,
    documentMode(contract),
  );
  return {
    kind: "render",
    html,
    filename: safePdfFilename(contract, lang),
    docNumber: contract.number ?? "DRAFT",
    lang,
  };
}

export async function buildContractCertificateHtml(
  contractId: string,
  lang: DocLang,
): Promise<string> {
  const contract = getContract(contractId);
  const snapshot = snapshotForRendering(contract);
  const company = getSettings("company");
  const defaults = getSettings("defaults");
  const logoDataUri =
    imageBySha(snapshot.provider.logoSha256) ??
    imageByFileId(company.logoFileId ?? null);
  const stampDataUri =
    imageBySha(snapshot.provider.stampSha256) ??
    imageByFileId(company.stampFileId ?? null);

  const verificationCode =
    contract.verificationCode ??
    contract.number ??
    (contract.status === "draft" ? "DRAFT-PREVIEW" : null);

  let verification: { code: string; url: string; qrDataUri: string } | null = null;
  if (verificationCode) {
    const url = verificationUrl(env.APP_URL, verificationCode);
    verification = {
      code: verificationCode,
      url,
      qrDataUri: await makeQrDataUri(url),
    };
  }

  const signatoryRows = contract.currentVersionId
    ? db
        .select()
        .from(contractSignatories)
        .where(
          and(
            eq(contractSignatories.contractId, contractId),
            eq(contractSignatories.versionId, contract.currentVersionId),
          ),
        )
        .orderBy(asc(contractSignatories.sortOrder))
        .all()
    : db
        .select()
        .from(contractSignatories)
        .where(eq(contractSignatories.contractId, contractId))
        .orderBy(asc(contractSignatories.sortOrder))
        .all();

  const isArabic = lang === "ar";
  const isIndividual =
    snapshot.client.type === "individual" || !snapshot.client.repNameAr;

  const defaultProviderName =
    (isArabic ? snapshot.provider.nameAr : snapshot.provider.nameEn) ||
    (isArabic ? "المفوض بالتوقيع" : "Authorized Signatory");

  const defaultClientName =
    (isArabic
      ? snapshot.client.repNameAr || snapshot.client.nameAr
      : snapshot.client.repNameEn || snapshot.client.nameEn) ||
    (isArabic
      ? isIndividual ? "العميل" : "ممثل العميل"
      : isIndividual ? "Client" : "Client Representative");

  const defaultClientTitle =
    (isArabic ? snapshot.client.repTitleAr : snapshot.client.repTitleEn) ||
    (isIndividual
      ? isArabic ? "العميل" : "Client"
      : isArabic ? "ممثل العميل" : "Client Representative");

  const signatures: SignatureRender[] =
    signatoryRows.length > 0
      ? signatoryRows.map((s) => {
          let resolvedTitle = s.title?.trim() || null;
          if (!resolvedTitle && s.signerUserId) {
            const u = db
              .select({
                titleAr: users.signerTitleAr,
                titleEn: users.signerTitleEn,
              })
              .from(users)
              .where(eq(users.id, s.signerUserId))
              .get();
            resolvedTitle = (isArabic ? u?.titleAr : u?.titleEn) || null;
          }
          if (!resolvedTitle) {
            resolvedTitle =
              s.role === "provider"
                ? isArabic
                  ? "المفوض بالتوقيع"
                  : "Authorized Signatory"
                : defaultClientTitle;
          } else if (
            s.role === "client" &&
            isIndividual &&
            (resolvedTitle === "ممثل العميل" || resolvedTitle === "Client Representative")
          ) {
            resolvedTitle = isArabic ? "العميل" : "Client";
          }
          return {
            role: s.role,
            name:
              s.name ||
              (s.role === "provider" ? defaultProviderName : defaultClientName),
            title: resolvedTitle,
            signedAtMs: s.signedAt,
            method: s.signatureMethod,
            imageDataUri: imageByFileId(s.signatureFileId),
            typedName: s.typedName,
          };
        })
      : [];

  const contentHash =
    contract.contentHash ?? sha256Hex(canonicalize(snapshot));

  const certificate: CertificateData = {
    contentHash,
    generatedAtMs:
      contract.signedAt ??
      contract.completedAt ??
      contract.updatedAt ??
      nowMs(),
    timezone: defaults.timezone,
    signatories: signatoryRows.map((s) => ({
      role: s.role,
      name: s.name,
      title: s.title,
      email: s.email,
      method: s.signatureMethod,
      signedAtMs: s.signedAt,
      ip: s.ip,
      otpVerified: s.otpVerifiedAt !== null,
      userAgent: s.userAgent,
    })),
  };

  return renderContractCertificateHtml({
    snapshot,
    lang,
    mode: "sealed",
    fonts: getFontCss(),
    logoDataUri,
    stampDataUri,
    signatures,
    verification,
    certificate,
  });
}

export async function resolveCertificatePdf(
  contractId: string,
  requestedLang: string | undefined,
): Promise<{ html: string; filename: string; docNumber: string; lang: DocLang }> {
  const contract = getContract(contractId);
  const lang = resolveDocLang(contract, requestedLang);
  const html = await buildContractCertificateHtml(contractId, lang);
  const base = contract.number ?? "draft";
  const filename = `${base}-certificate-${lang}.pdf`.replace(/[^A-Za-z0-9._-]/g, "");
  return {
    html,
    filename,
    docNumber: contract.number ?? "DRAFT",
    lang,
  };
}
