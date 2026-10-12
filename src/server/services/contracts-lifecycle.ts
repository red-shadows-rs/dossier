// Dossier - Contracts Lifecycle Service
// https://github.com/red-shadows-rs/dossier

import { and, asc, eq, lt } from "drizzle-orm";
import { db, withTx, type DbTx } from "@/db";
import { contractSignatories, contracts } from "@/db/schema";
import { hmacToken } from "@/lib/crypto";
import { nowMs, todayInTz } from "@/lib/dates";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { newToken } from "@/lib/ids";
import type { RequestMeta, SessionUser } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
import { enqueueEmail } from "@/server/services/email";
import { getSettings } from "@/server/services/settings";
import { tokenExpiryMs } from "@/server/services/contracts-send";
import { getContract, type ContractStatus } from "@/server/services/contracts";

export type ContractSignatoryRow = typeof contractSignatories.$inferSelect;

export function listContractSignatories(
  contractId: string,
): ContractSignatoryRow[] {
  const contract = db
    .select({ currentVersionId: contracts.currentVersionId })
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .get();

  if (contract?.currentVersionId) {
    return db
      .select()
      .from(contractSignatories)
      .where(
        and(
          eq(contractSignatories.contractId, contractId),
          eq(contractSignatories.versionId, contract.currentVersionId),
        ),
      )
      .orderBy(asc(contractSignatories.sortOrder))
      .all();
  }

  return db
    .select()
    .from(contractSignatories)
    .where(eq(contractSignatories.contractId, contractId))
    .orderBy(asc(contractSignatories.sortOrder))
    .all();
}

function revokeTokens(tx: DbTx, contractId: string): void {
  tx.update(contractSignatories)
    .set({
      tokenHash: null,
      tokenExpiresAt: null,
      otpHash: null,
      otpExpiresAt: null,
    })
    .where(eq(contractSignatories.contractId, contractId))
    .run();
}

function requireStatus(
  current: { status: ContractStatus },
  allowed: ContractStatus[],
  message: string,
): void {
  if (!allowed.includes(current.status)) {
    throw new AppError("INVALID_STATE", message);
  }
}

export function reviseContract(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const contract = tx
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .get();
    if (!contract) throw new AppError("NOT_FOUND", "Contract not found");
    requireStatus(
      contract,
      ["sent", "declined", "expired"],
      "Only a sent, declined or expired contract can be revised",
    );

    revokeTokens(tx, id);
    tx.update(contracts)
      .set({ status: "draft", versionNo: contract.versionNo + 1, updatedAt: now })
      .where(eq(contracts.id, id))
      .run();

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.recalled",
      entityType: "contract",
      entityId: id,
      meta: { versionNo: contract.versionNo + 1 },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function regenerateSigningLink(
  user: SessionUser,
  id: string,
  options: { email?: boolean },
  meta: RequestMeta,
): { url: string } {
  const settings = getSettings("signing");
  const contract = getContract(id);
  if (contract.status !== "sent") {
    throw new AppError("INVALID_STATE", "Only a sent contract has a live link");
  }

  const now = nowMs();
  const token = newToken();
  const tokenHash = hmacToken(token, env.APP_SECRET);
  const expiresAt = tokenExpiryMs(
    now,
    settings.linkTtlDays,
    contract.signingDeadline,
  );

  withTx((tx) => {
    const current = tx
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .get();
    if (!current || current.status !== "sent") {
      throw new AppError(
        "INVALID_STATE",
        "Only a sent contract has a live link",
      );
    }
    const client = tx
      .select()
      .from(contractSignatories)
      .where(
        current.currentVersionId
          ? and(
              eq(contractSignatories.contractId, id),
              eq(contractSignatories.role, "client"),
              eq(contractSignatories.versionId, current.currentVersionId),
            )
          : and(
              eq(contractSignatories.contractId, id),
              eq(contractSignatories.role, "client"),
            ),
      )
      .orderBy(asc(contractSignatories.sortOrder))
      .all()
      .at(-1);
    if (!client || client.status !== "pending") {
      throw new AppError(
        "INVALID_STATE",
        "The client signatory is not awaiting a signature",
      );
    }

    tx.update(contractSignatories)
      .set({
        tokenHash,
        tokenExpiresAt: expiresAt,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        otpVerifiedAt: null,
      })
      .where(eq(contractSignatories.id, client.id))
      .run();

    const url = `${env.APP_URL}/s/${token}`;
    if (options.email && client.email) {
      enqueueEmail(tx, {
        toEmail: client.email,
        toName: client.name,
        locale:
          current.languageMode === "ar"
            ? "ar"
            : current.languageMode === "en"
              ? "en"
              : "ar",
        templateKey: "contract_signing_link",
        payload: {
          contractId: id,
          signatoryId: client.id,
          number: current.number,
          titleAr: current.titleAr,
          titleEn: current.titleEn,
          url,
          token,
          expiresAt,
        },
        entityType: "contract",
        entityId: id,
      });
    }

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.link_regenerated",
      entityType: "contract",
      entityId: id,
      meta: { emailed: Boolean(options.email) },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });

  return { url: `${env.APP_URL}/s/${token}` };
}

export function expireContracts(): number {
  const tz = getSettings("defaults").timezone;
  const today = todayInTz(tz);
  const now = nowMs();

  const rows = db
    .select({ id: contracts.id })
    .from(contracts)
    .where(
      and(
        eq(contracts.status, "sent"),
        lt(contracts.signingDeadline, today),
      ),
    )
    .all();

  for (const row of rows) {
    withTx((tx) => {
      const contract = tx
        .select()
        .from(contracts)
        .where(eq(contracts.id, row.id))
        .get();
      if (!contract || contract.status !== "sent") return;
      revokeTokens(tx, row.id);
      tx.update(contracts)
        .set({ status: "expired", updatedAt: now })
        .where(eq(contracts.id, row.id))
        .run();
      audit(tx, {
        actorType: "system",
        action: "contract.expired",
        entityType: "contract",
        entityId: row.id,
        meta: { signingDeadline: contract.signingDeadline },
      });
    });
  }
  return rows.length;
}

export function completeContract(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const contract = tx
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .get();
    if (!contract) throw new AppError("NOT_FOUND", "Contract not found");
    requireStatus(contract, ["signed"], "Only a signed contract can complete");

    tx.update(contracts)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      .where(eq(contracts.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.completed",
      entityType: "contract",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function terminateContract(
  user: SessionUser,
  id: string,
  reason: string,
  meta: RequestMeta,
): void {
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    throw new AppError("VALIDATION_FAILED", "A termination reason is required", {
      reason: "errors.required",
    });
  }
  const now = nowMs();
  withTx((tx) => {
    const contract = tx
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .get();
    if (!contract) throw new AppError("NOT_FOUND", "Contract not found");
    requireStatus(
      contract,
      ["signed"],
      "Only a signed contract can be terminated",
    );

    tx.update(contracts)
      .set({
        status: "terminated",
        terminatedAt: now,
        terminationReason: trimmed,
        updatedAt: now,
      })
      .where(eq(contracts.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.terminated",
      entityType: "contract",
      entityId: id,
      meta: { reason: trimmed },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}
