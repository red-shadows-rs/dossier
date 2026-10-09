import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contractVersions } from "@/db/schema";
import { AppError } from "@/lib/errors";
import {
  allowedDocLangs,
  defaultDocLang,
  isDocLang,
  type DocLang,
} from "@/lib/doc-lang";
import { renderContractHtml } from "@/server/pdf/html/contract";
import { getFontCss } from "@/server/pdf/fonts";
import { findFileBySha256, readFile } from "@/server/services/files";
import type { ContractSnapshotV1 } from "@/server/templating/variables";
import { buildContractSnapshot } from "./contract-snapshot";
import { getContract, type ContractRow } from "./contracts";

export type ContractDocMode = "draft" | "preview" | "unsigned";

function toDataUri(mime: string, buffer: Buffer): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

// 12.8 — image by sha256 (missing file → null, never a crash).
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

// 7.6 / 7.7 — a versioned (non-draft) contract renders from its stored
// snapshot; a draft renders from live tables.
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
  return renderContractHtml({
    snapshot,
    lang,
    mode,
    fonts: getFontCss(),
    logoDataUri: imageBySha(snapshot.provider.logoSha256),
    stampDataUri: imageBySha(snapshot.provider.stampSha256),
    signatures: [],
    verification: null,
    certificate: null,
  });
}

// 12.9 — filename safe = [A-Za-z0-9._-] only.
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
  | { kind: "sealed"; fileId: string; filename: string }
  | { kind: "render"; html: string; filename: string; docNumber: string };

// Decides how to serve a contract PDF per 12.9.
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
  };
}
