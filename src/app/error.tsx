"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Gauge,
  RotateCcw,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    console.error("Dossier root error boundary:", error);
  }, [error]);

  const handleCopy = useCallback(() => {
    if (!error.digest) return;
    try {
      void navigator.clipboard.writeText(error.digest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  }, [error.digest]);

  return (
    <div className="flex min-h-screen min-h-dvh flex-col justify-between bg-background px-6 py-5 sm:px-8">
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-3">
          <LocaleSwitch />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-lg overflow-hidden border border-border/80 bg-card shadow-sm">
          <div className="h-1 w-full bg-destructive/80" />

          <div className="flex flex-col items-center p-6 text-center sm:p-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10 text-destructive shadow-sm">
              <AlertCircle size={28} strokeWidth={2} aria-hidden="true" />
            </div>

            <div className="mb-3">
              <Badge tone="red" dot>
                {t("systemError")}
              </Badge>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {t("somethingWentWrong")}
            </h1>

            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("errorDescription")}
            </p>

            {error.digest ? (
              <div className="mt-4 flex w-full max-w-xs items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-1.5 text-xs font-mono text-muted-foreground">
                <span className="truncate">
                  <span className="text-muted-foreground/70">{t("errorReference")}: </span>
                  <span className="select-all font-semibold text-foreground">
                    {error.digest}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex shrink-0 items-center gap-1 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  title={copied ? t("referenceCopied") : t("copyReference")}
                  aria-label={t("copyReference")}
                >
                  {copied ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                  <span className="text-[11px] font-sans">
                    {copied ? t("referenceCopied") : ""}
                  </span>
                </button>
              </div>
            ) : null}

            <div className="mt-6 flex w-full flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-center">
              <Link href="/" className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  className="w-full justify-center gap-2 sm:w-auto"
                >
                  <Gauge size={16} aria-hidden="true" />
                  <span>{t("backToDashboard")}</span>
                </Button>
              </Link>
              <Button
                type="button"
                variant="primary"
                onClick={reset}
                className="w-full justify-center gap-2 sm:w-auto"
              >
                <RotateCcw size={16} aria-hidden="true" />
                <span>{tc("retry")}</span>
              </Button>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft
                size={13}
                className="rtl:rotate-180"
                aria-hidden="true"
              />
              <span>{t("previousPage")}</span>
            </button>
          </div>

          <div className="border-t border-border/60 bg-muted/20 px-6 py-2.5 text-center text-xs text-muted-foreground">
            {t("supportHint")}
          </div>
        </Card>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs text-muted-foreground">
        <span>{tc("rights", { year })}</span>
        <a
          href="https://red-shadows-rs.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-muted-foreground transition hover:text-foreground"
        >
          <Image
            src="/red-shadows-logo.png"
            alt=""
            width={512}
            height={353}
            style={{ height: "1rem", width: "auto" }}
          />
          <span dir="ltr">RED SHADOWS | RS</span>
        </a>
      </footer>
    </div>
  );
}
