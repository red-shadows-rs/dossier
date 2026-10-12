import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/forms/LoginForm";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { Logo } from "@/components/layout/Logo";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { resolveTheme, THEME_COOKIE } from "@/lib/i18n";
import { getCurrentUser } from "@/server/auth/require-user";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }
  const t = await getTranslations("auth");
  const tc = await getTranslations("common");
  const store = await cookies();
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);
  const year = new Date().getFullYear();

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
      <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>{tc("rights", { year })}</p>
        <a
          href="https://red-shadows-rs.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
        >
          <Image
            src="/red-shadows-logo.png"
            alt=""
            width={512}
            height={353}
            className="h-5 w-auto"
          />
          <span dir="ltr">RED SHADOWS | RS</span>
        </a>
      </footer>
    </div>
  );
}