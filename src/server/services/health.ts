// Dossier - Health Service
// https://github.com/red-shadows-rs/dossier

import { sqlite } from "@/db";

export type HealthDb = {
  prepare(sql: string): { get(): unknown };
};

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
