import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AccountForm } from "@/components/forms/AccountForm";
import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { resolveTheme, THEME_COOKIE } from "@/lib/i18n";
import { requireUserPage } from "@/server/auth/require-user";

export default async function AccountPage() {
  const user = await requireUserPage();
  const t = await getTranslations("account");
  const store = await cookies();
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
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
          <CardTitle>{t("theme")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeSwitch current={theme} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("password")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
