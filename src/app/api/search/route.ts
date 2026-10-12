import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/require-user";
import { searchAll } from "@/server/services/search";

export async function GET(request: NextRequest): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHENTICATED" } },
      { status: 401 },
    );
  }
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const data = searchAll(user, q, user.locale === "ar" ? "ar" : "en");
  return NextResponse.json({ ok: true, data });
}