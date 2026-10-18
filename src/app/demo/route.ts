// Dossier - Demo Route Handler
// https://github.com/red-shadows-rs/dossier

import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import {
  DEMO_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/server/auth/session";
import { getRequestMeta } from "@/server/services/audit";
import { loginAsDemo } from "@/server/services/demo";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const meta = await getRequestMeta();
  const token = await loginAsDemo(meta);

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${proto}://${host}` : env.APP_URL;

  const targetUrl = new URL("/", baseUrl);
  const response = NextResponse.redirect(targetUrl, 303);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  response.cookies.set(DEMO_COOKIE, "1", sessionCookieOptions());
  return response;
}
