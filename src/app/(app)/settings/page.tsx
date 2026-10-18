// Dossier - Settings Page
// https://github.com/red-shadows-rs/dossier

import { redirect } from "next/navigation";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";

export default async function SettingsIndexPage() {
  const user = await requireUserPage();
  if (isDemoUser(user.email)) {
    redirect("/");
  }
  redirect("/settings/company");
}
