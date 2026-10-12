// Dossier - Contract Snapshot Service
// https://github.com/red-shadows-rs/dossier

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  contractClauses,
  contractItems,
  contractSignatories,
  contracts,
  paymentMilestones,
  projects,
} from "@/db/schema";
import { canonicalize } from "@/lib/canonical-json";
import { sha256Hex } from "@/lib/crypto";
import { nowMs, todayInTz } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { getFileRow } from "@/server/services/files";
import { getSettings } from "@/server/services/settings";
import type { ContractSnapshotV1 } from "@/server/templating/variables";

export type SnapshotSignatory = {
  role: "provider" | "client";
  name: string;
  title: string | null;
  email: string | null;
};

function pickSha(fileId: string | null): string | null {
  if (!fileId) return null;
  return getFileRow(fileId)?.sha256 ?? null;
}

export function buildContractSnapshot(
  contractId: string,
  signatories: SnapshotSignatory[] = [],
): ContractSnapshotV1 {
  const contract = db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .get();
  if (!contract) {
    throw new AppError("NOT_FOUND", "Contract not found");
  }
  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, contract.clientId))
    .get();
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, contract.projectId))
    .get();
  if (!client || !project) {
    throw new AppError("INTERNAL", "Contract references a missing party");
  }

  const company = getSettings("company");
  const defaults = getSettings("defaults");

  const items = db
    .select()
    .from(contractItems)
    .where(eq(contractItems.contractId, contractId))
    .orderBy(asc(contractItems.position))
    .all();
  const milestones = db
    .select()
    .from(paymentMilestones)
    .where(eq(paymentMilestones.contractId, contractId))
    .orderBy(asc(paymentMilestones.position))
    .all();
  const clauses = db
    .select()
    .from(contractClauses)
    .where(eq(contractClauses.contractId, contractId))
    .orderBy(asc(contractClauses.position))
    .all();

  const resolvedSignatories =
    signatories.length > 0
      ? signatories
      : db
          .select()
          .from(contractSignatories)
          .where(eq(contractSignatories.contractId, contractId))
          .orderBy(asc(contractSignatories.sortOrder))
          .all()
          .map((row) => ({
            role: row.role,
            name: row.name,
            title: row.title,
            email: row.email,
          }));

  return {
    schema: "dossier.contract.v1",
    contract: {
      id: contract.id,
      number: contract.number,
      versionNo: contract.versionNo,
      languageMode: contract.languageMode,
      hasFees: contract.hasFees,
      issueDate: todayInTz(defaults.timezone),
      titleAr: contract.titleAr,
      titleEn: contract.titleEn,
      scopeAr: contract.scopeAr,
      scopeEn: contract.scopeEn,
      currency: contract.currency,
      startDate: contract.startDate,
      endDate: contract.endDate,
      paymentTermsDays: contract.paymentTermsDays,
      governingLawAr: contract.governingLawAr,
      governingLawEn: contract.governingLawEn,
      jurisdictionAr: contract.jurisdictionAr,
      jurisdictionEn: contract.jurisdictionEn,
      signingDeadline: contract.signingDeadline,
      milestoneMode: contract.milestoneMode,
    },
    provider: {
      nameAr: company.nameAr || null,
      nameEn: company.nameEn || null,
      legalNameAr: company.legalNameAr || null,
      legalNameEn: company.legalNameEn || null,
      crNumber: company.crNumber || null,
      taxNumber: company.taxNumber || null,
      addressAr: company.addressAr || null,
      addressEn: company.addressEn || null,
      email: company.email || null,
      phone: company.phone || null,
      website: company.website || null,
      logoSha256: pickSha(company.logoFileId),
      stampSha256: pickSha(company.stampFileId),
    },
    client: {
      id: client.id,
      type: client.type,
      nameAr: client.nameAr,
      nameEn: client.nameEn,
      legalNameAr: client.legalNameAr,
      legalNameEn: client.legalNameEn,
      email: client.email,
      phone: client.phone,
      country: client.country,
      city: client.city,
      addressAr: client.addressAr,
      addressEn: client.addressEn,
      taxNumber: client.taxNumber,
      crNumber: client.crNumber,
      repNameAr: client.repNameAr,
      repNameEn: client.repNameEn,
      repTitleAr: client.repTitleAr,
      repTitleEn: client.repTitleEn,
    },
    project: {
      id: project.id,
      code: project.code,
      nameAr: project.nameAr,
      nameEn: project.nameEn,
      description: project.description,
    },
    items: items.map((item) => ({
      position: item.position,
      descriptionAr: item.descriptionAr,
      descriptionEn: item.descriptionEn,
      qtyMilli: item.qtyMilli,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.lineTotalMinor,
    })),
    totals: {
      subtotalMinor: contract.subtotalMinor,
      discountType: contract.discountType,
      discountValue: contract.discountValue,
      discountMinor: contract.discountMinor,
      netMinor: contract.netMinor,
      taxRateBp: contract.taxRateBp,
      taxMinor: contract.taxMinor,
      totalMinor: contract.totalMinor,
    },
    milestones: milestones.map((m) => ({
      position: m.position,
      titleAr: m.titleAr,
      titleEn: m.titleEn,
      percentBp: m.percentBp,
      amountMinor: m.amountMinor,
      taxMinor: m.taxMinor,
      totalMinor: m.totalMinor,
      dueDate: m.dueDate,
      triggerNoteAr: m.triggerNoteAr,
      triggerNoteEn: m.triggerNoteEn,
    })),
    clauses: clauses.map((clause) => ({
      position: clause.position,
      key: clause.key,
      titleAr: clause.titleAr,
      titleEn: clause.titleEn,
      bodyAr: clause.bodyAr,
      bodyEn: clause.bodyEn,
    })),
    signatories: resolvedSignatories,
  };
}

export function hashSnapshot(snapshot: ContractSnapshotV1): string {
  return sha256Hex(canonicalize(snapshot));
}

export function snapshotNowMs(): number {
  return nowMs();
}
