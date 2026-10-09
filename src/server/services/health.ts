import { sqlite } from "@/db";

export type HealthDb = {
  prepare(sql: string): { get(): unknown };
};

// 15.5 — health is a single `SELECT 1`; a closed/broken DB must not throw.
export function checkDatabase(handle: HealthDb = sqlite): boolean {
  try {
    handle.prepare("SELECT 1").get();
    return true;
  } catch {
    return false;
  }
}

export function getHealth(handle: HealthDb = sqlite): { ok: boolean } {
  return { ok: checkDatabase(handle) };
}
