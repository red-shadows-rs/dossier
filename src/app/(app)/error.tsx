// Dossier - Root Error Boundary
// https://github.com/red-shadows-rs/dossier

"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Button } from "@/components/ui/Button";

export default function AppError({
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

  useEffect(() => {
    console.error("Dossier application error boundary:", error);
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
    <div className="flex min-h-[65vh] w-full items-center justify-center py-12 px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive shadow-sm">
            <AlertCircle size={26} strokeWidth={1.75} aria-hidden="true" />
          </div>

          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-destructive">
            500 Error
          </span>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {t("somethingWentWrong")}
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("errorDescription")}
          </p>

          {error.digest ? (
            <div className="mt-5 flex w-full max-w-xs items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3.5 py-2 text-xs font-mono text-muted-foreground">
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
              className="w-full justify-center gap-2 sm:w-auto"
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

        <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground/80">
          {t("supportHint")}
        </div>
      </div>
    </div>
  );
}