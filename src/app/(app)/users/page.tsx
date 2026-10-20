// Dossier - Users Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { Plus, UserCog } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return {
    title: t("users"),
  };
}
import { Button } from "@/components/ui/Button";
import { UsersTable } from "@/components/tables/UsersTable";
import { withDbInstance } from "@/db";
import { ROLES, type Locale } from "@/lib/constants";
import { isLocale } from "@/lib/i18n";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";
import { getSettings } from "@/server/services/settings";
import { listUsers } from "@/server/services/users";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function UsersPage() {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "users.manage");
  const isDemo = isDemoUser(user.email);

  return withDbInstance(isDemo, async () => {
    const t = await getTranslations("users");
    const tc = await getTranslations("common");
    const rawLocale = await getLocale();
    const locale: Locale = isLocale(rawLocale) ? rawLocale : user.locale;
    const timezone = getSettings("defaults").timezone;
    const rows = listUsers();

  const labels = {
    name: t("name"),
    email: t("email"),
    roleLabel: t("roleLabel"),
    canSign: t("canSignForCompany"),
    status: tc("status"),
    lastLogin: t("lastLogin"),
    actions: tc("actions"),
    preview: tc("preview"),
    yes: t("yes"),
    active: t("active"),
    disabled: t("disabled"),
    empty: t("empty"),
    roleValues: Object.fromEntries(
      ROLES.map((value) => [value, t(`role.${value}`)]),
    ),
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <UserCog size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
              <span className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground translate-y-0.5">
                {rows.length}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/users/new">
            <Button type="button" className="gap-1.5 font-medium shadow-xs">
              <Plus size={16} aria-hidden="true" />
              <span>{t("new")}</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded border border-border bg-card overflow-hidden">
        <UsersTable
          rows={rows}
          labels={labels}
          timezone={timezone}
          locale={locale}
        />
      </div>
    </div>
    );
  });
}
