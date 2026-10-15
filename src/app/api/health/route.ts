import { NextResponse } from "next/server";
import { getHealth } from "@/server/services/health";

export function GET(): Response {
  const health = getHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
