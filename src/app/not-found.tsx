// Dossier - Not Found Page
// https://github.com/red-shadows-rs/dossier

import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { FileQuestion, Gauge } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { Logo } from "@/components/layout/Logo";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { resolveTheme, THEME_COOKIE } from "@/lib/i18n";

export default async function NotFound() {
  const t = await getTranslations("errors");
  const tn = await getTranslations("nav");
  const store = await cookies();
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);

  return (
    <div className="flex min-h-screen min-h-dvh flex-col justify-between bg-background px-6 py-5 sm:px-8">
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeSwitch current={theme} />
          <LocaleSwitch />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md border border-border bg-card p-8 text-center shadow-sm">
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground shadow-sm">
              <FileQuestion size={26} strokeWidth={1.75} aria-hidden="true" />
            </div>

            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              404
            </span>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {t("notFoundTitle")}
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("notFoundDescription")}
            </p>

            <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-center">
              <Link href="/" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  className="w-full justify-center gap-2 sm:w-auto"
                >
                  <Gauge size={16} aria-hidden="true" />
                  <span>{tn("dashboard")}</span>
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </main>

      <Footer bordered={false} />
    </div>
  );
}