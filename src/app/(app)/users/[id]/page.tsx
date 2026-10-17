// Dossier - Users Id Page
// https://github.com/red-shadows-rs/dossier

import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, KeyRound, UserCheck, UserCog } from "lucide-react";
import { UserForm } from "@/components/forms/UserForm";
import { UserPasswordForm } from "@/components/forms/UserPasswordForm";
import { UserStatusButton } from "@/components/forms/UserStatusButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Locale } from "@/lib/constants";
import { formatInstant } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isLocale } from "@/lib/i18n";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings";
import { getUser } from "@/server/services/users";
import { smoothLoading } from "@/lib/smooth-loader";

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
    <div className="flex flex-col gap-1 rounded border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/30">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd dir={dir} className="text-sm font-semibold tracking-tight text-foreground break-words">
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
  await smoothLoading();
  const actor = await requireUserPage();
  assertCan(actor, "users.manage");
  const t = await getTranslations("users");
  const tc = await getTranslations("common");
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href="/users"
            className="hover:text-foreground transition-colors"
          >
            {t("title")}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium truncate max-w-[240px]">
            {target.name}
          </span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
              <UserCog size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {target.name}
                </h1>
                {target.status === "active" ? (
                  <Badge tone="green">{t("active")}</Badge>
                ) : (
                  <Badge tone="gray">{t("disabled")}</Badge>
                )}
                <Badge tone="gray">{t(`role.${target.role}`)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {target.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/users">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5 font-medium shadow-xs"
              >
                <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
                <span>{tc("back")}</span>
              </Button>
            </Link>
            <UserStatusButton userId={target.id} status={target.status} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <UserCheck size={18} className="text-primary" aria-hidden="true" />
            <span>{t("profile")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <CardTitle className="inline-flex items-center gap-2">
            <UserCog size={18} className="text-primary" aria-hidden="true" />
            <span>{t("editTitle")}</span>
          </CardTitle>
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
          <CardTitle className="inline-flex items-center gap-2">
            <KeyRound size={18} className="text-primary" aria-hidden="true" />
            <span>{t("passwordTitle")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserPasswordForm userId={target.id} />
        </CardContent>
      </Card>
    </div>
  );
}
