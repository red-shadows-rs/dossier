import Link from "next/link";
import { Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { UsersTable } from "@/components/tables/UsersTable";
import { ROLES, type Locale } from "@/lib/constants";
import { isLocale } from "@/lib/i18n";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings";
import { listUsers } from "@/server/services/users";

export default async function UsersPage() {
  const user = await requireUserPage();
  assertCan(user, "users.manage");
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <Link href="/users/new">
          <Button type="button">
            <Plus size={16} aria-hidden="true" />
            {t("new")}
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent>
          <UsersTable
            rows={rows}
            labels={labels}
            timezone={timezone}
            locale={locale}
          />
        </CardContent>
      </Card>
    </div>
  );
}
