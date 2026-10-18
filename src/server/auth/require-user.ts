// Dossier - Require User Module
// https://github.com/red-shadows-rs/dossier

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setDbMode } from "@/db";
import { AppError } from "@/lib/errors";
import { isDemoUser } from "@/server/services/demo";
import {
  DEMO_COOKIE,
  isDemoToken,
  SESSION_COOKIE,
  validateSession,
  type SessionUser,
} from "./session";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const isDemo = isDemoToken(token) || store.get(DEMO_COOKIE)?.value === "1";
  setDbMode(isDemo ? "demo" : "main");
  return validateSession(token);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("UNAUTHENTICATED", "Not signed in");
  }
  const isDemo = isDemoUser(user.email);
  setDbMode(isDemo ? "demo" : "main");
  return user;
}

export async function requireUserPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const isDemo = isDemoUser(user.email);
  setDbMode(isDemo ? "demo" : "main");
  return user;
}
