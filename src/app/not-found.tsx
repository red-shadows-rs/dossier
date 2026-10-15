import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { FileQuestion, Gauge } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { Logo } from "@/components/layout/Logo";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { Badge } from "@/components/ui/Badge";
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
        <Card className="w-full max-w-lg overflow-hidden border border-border/80 bg-card text-center shadow-sm">
          <div className="h-1 w-full bg-primary/70" />

          <div className="flex flex-col items-center p-6 sm:p-8">
            <div className="relative mb-3 flex items-center justify-center">
              <span className="select-none font-mono text-7xl font-black tracking-widest text-muted-foreground/15 sm:text-8xl">
                404
              </span>
              <div className="absolute flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                <FileQuestion size={24} strokeWidth={2} aria-hidden="true" />
              </div>
            </div>

            <div className="mb-3">
              <Badge tone="gray" dot>
                {t("notFoundTitle")}
              </Badge>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {t("notFoundTitle")}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("notFoundDescription")}
            </p>

            <div className="mt-6 flex w-full justify-center">
              <Link href="/">
                <Button
                  variant="primary"
                  className="inline-flex items-center gap-2"
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