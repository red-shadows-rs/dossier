import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserForm } from "@/components/forms/UserForm";
import { UserPasswordForm } from "@/components/forms/UserPasswordForm";
import { UserStatusButton } from "@/components/forms/UserStatusButton";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Locale } from "@/lib/constants";
import { formatInstant } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isLocale } from "@/lib/i18n";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings";
import { getUser } from "@/server/services/users";

function Row({
  label,
  value,
  dir,
}: {
  label: string;
  value: string | null;
  dir?: "ltr" | "rtl";
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd dir={dir} className="text-sm text-foreground">
        {value}
      </dd>
    </div>
  );
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireUserPage();
  assertCan(actor, "users.manage");
  const t = await getTranslations("users");
  const rawLocale = await getLocale();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : actor.locale;
  const timezone = getSettings("defaults").timezone;
  const { id } = await params;

  let target;
  try {
    target = getUser(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            {target.name}
          </h1>
          {target.status === "active" ? (
            <Badge tone="green">{t("active")}</Badge>
          ) : (
            <Badge tone="gray">{t("disabled")}</Badge>
          )}
        </div>
        <UserStatusButton userId={target.id} status={target.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Row label={t("email")} value={target.email} dir="ltr" />
            <Row label={t("roleLabel")} value={t(`role.${target.role}`)} />
            <Row
              label={t("canSignForCompany")}
              value={target.canSignForCompany ? t("yes") : t("no")}
            />
            <Row
              label={t("lastLogin")}
              value={
                target.lastLoginAt
                  ? formatInstant(target.lastLoginAt, timezone, locale)
                  : null
              }
            />
            <Row
              label={t("createdAt")}
              value={formatInstant(target.createdAt, timezone, locale)}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("editTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            mode="edit"
            userId={target.id}
            initial={{
              email: target.email,
              name: target.name,
              role: target.role,
              canSignForCompany: target.canSignForCompany,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("passwordTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <UserPasswordForm userId={target.id} />
        </CardContent>
      </Card>
    </div>
  );
}
