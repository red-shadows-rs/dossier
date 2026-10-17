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

      <main className="relative flex flex-1 items-center justify-center p-4 overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 inset-x-0 mx-auto h-72 w-72 rounded-full bg-rose-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-lg rounded-lg border border-border/70 bg-card/90 p-8 sm:p-10 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 ring-4 ring-rose-500/5 shadow-inner">
              <AlertCircle size={32} strokeWidth={2.2} aria-hidden="true" />
            </div>

            <div className="mb-3">
              <Badge tone="red" dot>
                {t("systemError")}
              </Badge>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {t("somethingWentWrong")}
            </h1>

            <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("errorDescription")}
            </p>

            {error.digest ? (
              <div className="mt-5 flex w-full max-w-xs items-center justify-between gap-2 rounded-md border border-border/80 bg-muted/40 px-3.5 py-2 text-xs font-mono text-muted-foreground">
                <span className="truncate">
                  <span className="text-muted-foreground/70">{t("errorReference")}: </span>
                  <span className="select-all font-semibold text-foreground tracking-wide">
                    {error.digest}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  title={copied ? t("referenceCopied") : t("copyReference")}
                  aria-label={t("copyReference")}
                >
                  {copied ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                  {copied ? (
                    <span className="text-[11px] font-sans text-emerald-500 font-medium">
                      {t("referenceCopied")}
                    </span>
                  ) : null}
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
                className="w-full justify-center gap-2 sm:w-auto shadow-sm"
              >
                <RotateCcw size={16} aria-hidden="true" />
                <span>{tc("retry")}</span>
              </Button>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft
                size={13}
                className="rtl:rotate-180"
                aria-hidden="true"
              />
              <span>{t("previousPage")}</span>
            </button>
          </div>

          <div className="mt-8 border-t border-border/50 pt-4 text-center text-xs text-muted-foreground/80">
            {t("supportHint")}
          </div>
        </div>
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
