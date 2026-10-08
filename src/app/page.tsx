import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { resolveTheme, THEME_COOKIE } from "@/lib/i18n";
import { logoutAction } from "@/server/actions/auth";
import { getCurrentUser } from "@/server/auth/require-user";

export default async function HomePage() {
  const t = await getTranslations();
  const store = await cookies();
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);
  const user = await getCurrentUser();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-3">
        <LocaleSwitch />
        <ThemeSwitch current={theme} />
      </div>
      <h1 className="text-4xl font-bold text-primary">Dossier</h1>
      <p className="text-muted-foreground">{t("common.tagline")}</p>

      {user ? (
        <form action={logoutAction} className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {t("auth.signedInAs", { name: user.name })}
          </span>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1 text-sm text-foreground hover:bg-surface"
          >
            {t("nav.logout")}
          </button>
        </form>
      ) : (
        <Link
          href="/login"
          className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90"
        >
          {t("auth.signIn")}
        </Link>
      )}
    </main>
  );
}
