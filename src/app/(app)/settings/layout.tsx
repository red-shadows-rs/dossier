import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { SettingsNav } from "@/components/layout/SettingsNav";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUserPage();
  assertCan(user, "settings.read");
  const t = await getTranslations("settings");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <SettingsNav />
      {children}
    </div>
  );
}
