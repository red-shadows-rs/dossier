// Dossier - Demo Route Handler
// https://github.com/red-shadows-rs/dossier

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/session";
import { getRequestMeta } from "@/server/services/audit";
import { loginAsDemo } from "@/server/services/demo";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const meta = await getRequestMeta();
  const token = await loginAsDemo(meta);

  const targetUrl = new URL("/", request.url);
  const response = NextResponse.redirect(targetUrl, 303);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}

