// Dossier - Settings Layout
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return {
    title: t("settings"),
  };
}
import { SettingsNav } from "@/components/layout/SettingsNav";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUserPage();
  if (isDemoUser(user.email)) {
    redirect("/");
  }
  assertCan(user, "settings.read");
  const t = await getTranslations("settings");

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Settings size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
      </div>
      <SettingsNav />
      <div className="w-full">{children}</div>
    </div>
  );
}
