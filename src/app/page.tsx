import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { resolveTheme, THEME_COOKIE } from "@/lib/i18n";

export default async function HomePage() {
  const t = await getTranslations("common");
  const store = await cookies();
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <div className="flex items-center gap-3">
        <LocaleSwitch />
        <ThemeSwitch current={theme} />
      </div>
      <h1 className="text-4xl font-bold text-primary">Dossier</h1>
      <p className="text-muted-foreground">{t("tagline")}</p>
    </main>
  );
}
