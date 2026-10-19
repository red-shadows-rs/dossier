// Dossier - Login Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Footer } from "@/components/layout/Footer";
import { LoginForm } from "@/components/forms/LoginForm";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { Logo } from "@/components/layout/Logo";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { resolveTheme, THEME_COOKIE } from "@/lib/i18n";
import { getCurrentUser } from "@/server/auth/require-user";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("loginTitle"),
  };
}

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  const t = await getTranslations("auth");
  const store = await cookies();
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 py-5 sm:px-8">
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeSwitch current={theme} />
          <LocaleSwitch />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold text-foreground">{t("loginTitle")}</h1>
        <LoginForm />
      </main>
      <Footer bordered={false} />
    </div>
  );
}