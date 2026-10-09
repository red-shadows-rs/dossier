import { NextResponse } from "next/server";
import { getHealth } from "@/server/services/health";

// 15.5 — public liveness probe: `{"ok":true}` (200) or `{"ok":false}` (503).
// No versions, no internals.
export function GET(): Response {
  const health = getHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
