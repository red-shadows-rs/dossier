// Dossier - Account Page
// https://github.com/red-shadows-rs/dossier

import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { KeyRound, Palette, User } from "lucide-react";
import { AccountForm } from "@/components/forms/AccountForm";
import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { resolveTheme, THEME_COOKIE } from "@/lib/i18n";
import { requireUserPage } from "@/server/auth/require-user";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function AccountPage() {
  await smoothLoading();
  const user = await requireUserPage();
  const t = await getTranslations("account");
  const store = await cookies();
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <User size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <User size={18} className="text-primary" aria-hidden="true" />
            <span>{t("profile")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AccountForm
            name={user.name}
            locale={user.locale}
            signerTitleAr={user.signerTitleAr ?? ""}
            signerTitleEn={user.signerTitleEn ?? ""}
            canSignForCompany={user.canSignForCompany}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Palette size={18} className="text-primary" aria-hidden="true" />
            <span>{t("theme")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeSwitch current={theme} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <KeyRound size={18} className="text-primary" aria-hidden="true" />
            <span>{t("password")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
