import { and, eq, sql } from "drizzle-orm";
import type { DbTx } from "@/db";
import { numberSequences } from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { SEQ_KEYS } from "@/lib/constants";

export type SeqKey = (typeof SEQ_KEYS)[number];

function pad(value: number): string {
  return String(value).padStart(4, "0");
}

export function formatProjectCode(n: number): string {
  return `P-${pad(n)}`;
}

export function formatDocNumber(
  prefix: string,
  kind: "C" | "I",
  year: number,
  n: number,
): string {
  return `${prefix}-${kind}-${year}-${pad(n)}`;
}

export function allocateNumber(tx: DbTx, key: SeqKey, year: number): number {
  tx.insert(numberSequences)
    .values({ seqKey: key, year, lastValue: 0 })
    .onConflictDoNothing()
    .run();

  const row = tx
    .update(numberSequences)
    .set({ lastValue: sql`${numberSequences.lastValue} + 1` })
    .where(and(eq(numberSequences.seqKey, key), eq(numberSequences.year, year)))
    .returning({ v: numberSequences.lastValue })
    .get();

  if (!row) {
    throw new AppError("INTERNAL", "Failed to allocate a sequence number");
  }
  return row.v;
}
