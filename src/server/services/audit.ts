import { headers } from "next/headers";
import { nowMs } from "@/lib/dates";
import type { DbTx } from "@/db";
import { auditLog } from "@/db/schema";
import type { RequestMeta } from "@/server/auth/session";

export type AuditEntry = {
  actorType: "user" | "signer" | "system";
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

export function audit(tx: DbTx, entry: AuditEntry): void {
  tx.insert(auditLog)
    .values({
      ts: nowMs(),
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      metaJson: entry.meta ? JSON.stringify(entry.meta) : null,
    })
    .run();
}

export async function getRequestMeta(): Promise<RequestMeta> {
  const store = await headers();
  const ip = store.get("x-real-ip");
  const userAgent = store.get("user-agent");
  return {
    ip: ip ?? null,
    userAgent: userAgent ? userAgent.slice(0, 300) : null,
  };
}
