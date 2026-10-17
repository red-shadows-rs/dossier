"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileCheck,
  RefreshCw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DocumentSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/components/ui/cn";
import {
  allowedDocLangs,
  defaultDocLang,
  type DocLang,
  type LanguageMode,
} from "@/lib/doc-lang";
import type { Issue } from "@/lib/validation/issues";
import { getContractPreviewHtmlAction } from "@/server/actions/contracts";
import { SendContractDialog, type SignerOption } from "./SendContractDialog";

export type SendContext = {
  signers: SignerOption[];
  clientDefaults: { name: string; title: string; email: string };
  consentText: string;
  requireProviderSignature: boolean;
};

type BuilderStep = "basics" | "pricing" | "schedule" | "clauses";

function stepForField(field: string | undefined): BuilderStep {
  if (!field) return "basics";
  if (
    field.startsWith("item") ||
    field.startsWith("discount") ||
    field.startsWith("currency") ||
    field.startsWith("total") ||
    field.startsWith("taxRate")
  ) {
    return "pricing";
  }
  if (field.startsWith("milestone")) return "schedule";
  if (field.startsWith("clause") || field === "blocks" || field === "clauses") {
    return "clauses";
  }
  return "basics";
}

export function ContractReviewStep({
  id,
  languageMode,
  issues,
  sendContext,
  onJump,
  onPrev,
}: {
  id: string;
  languageMode: LanguageMode;
  issues: Issue[];
  sendContext: SendContext;
  onJump: (step: BuilderStep) => void;
  onPrev?: () => void;
}) {
  const t = useTranslations("contracts");
  const tRoot = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const langs = allowedDocLangs(languageMode);
  const [lang, setLang] = useState<DocLang>(defaultDocLang(languageMode));
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [iframeHeight, setIframeHeight] = useState<number>(650);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getContractPreviewHtmlAction({ id, lang }).then((result) => {
      if (!active) return;
      setLoading(false);
      if (result.ok) {
        setHtml(result.data.html);
      } else {
        setHtml(null);
      }
    });
    return () => {
      active = false;
    };
  }, [id, lang]);

  function reloadPreview() {
    setLoading(true);
    getContractPreviewHtmlAction({ id, lang }).then((result) => {
      setLoading(false);
      if (result.ok) {
        setHtml(result.data.html);
      } else {
        setHtml(null);
      }
    });
  }

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  function renderIssue(issue: Issue, index: number) {
    const isError = issue.severity === "error";
    const targetStep = stepForField(issue.field);

    return (
      <li
        key={`${issue.code}-${index}`}
        className={cn(
          "flex flex-col gap-2 rounded-md border p-3.5 sm:flex-row sm:items-center sm:justify-between transition-all",
          isError
            ? "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
            : "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50",
        )}
      >
        <div className="flex items-start gap-2.5">
          {isError ? (
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          )}
          <span
            className={cn(
              "text-xs font-medium leading-relaxed",
              isError ? "text-destructive" : "text-amber-700 dark:text-amber-400",
            )}
          >
            {tRoot(issue.messageKey, issue.params)}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onJump(targetStep)}
          className="shrink-0 gap-1.5 text-xs h-7 self-end sm:self-auto"
        >
          <span>{t("review.jump")}</span>
          <ExternalLink className="h-3 w-3" />
        </Button>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
      {/* Issues / Health Validation Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="inline-flex items-center gap-2">
              <CheckCircle2 size={18} className="text-primary" aria-hidden="true" />
              <span>{t("review.issuesTitle")}</span>
            </CardTitle>
            {errors.length === 0 && warnings.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isAr ? "جاهز للإرسال" : "Ready to send"}</span>
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold font-mono",
                  errors.length > 0
                    ? "border border-destructive/30 bg-destructive/10 text-destructive"
                    : "border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                )}
              >
                {isAr
                  ? `${errors.length} أخطاء / ${warnings.length} تنبيهات`
                  : `${errors.length} errors / ${warnings.length} warnings`}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {errors.length === 0 && warnings.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded border border-primary/20 bg-primary/5 p-4 text-xs font-medium text-foreground">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              <span>{t("review.noIssues")}</span>
            </div>
          ) : null}

          {errors.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{t("review.errors")}</span>
              </h3>
              <ul className="flex flex-col gap-2">{errors.map(renderIssue)}</ul>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{t("review.warnings")}</span>
              </h3>
              <ul className="flex flex-col gap-2">{warnings.map(renderIssue)}</ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Document Live Preview Card */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <CardTitle className="inline-flex items-center gap-2">
            <FileCheck size={18} className="text-primary" aria-hidden="true" />
            <span>{t("review.previewTitle")}</span>
          </CardTitle>

          <div className="flex items-center gap-2">
            {langs.length > 1 ? (
              <div className="flex rounded border border-border/80 bg-muted/40 p-0.5">
                {langs.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-current={value === lang ? "true" : undefined}
                    onClick={() => setLang(value)}
                    className={cn(
                      "rounded px-3 py-1 text-xs font-semibold transition-all select-none",
                      value === lang
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(`languageModes.${value}`)}
                  </button>
                ))}
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reloadPreview}
              loading={loading}
              className="h-8 w-8 p-0"
              aria-label="تحديث المعاينة"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded border border-border/80 bg-muted/20 p-2 sm:p-4">
            {loading ? (
              <DocumentSkeleton className="min-h-[30rem] rounded" />
            ) : html ? (
              <div className="overflow-hidden rounded border border-border/80 bg-white shadow-2xs dark:bg-card">
                <iframe
                  title={t("review.previewTitle")}
                  sandbox="allow-same-origin"
                  srcDoc={html}
                  scrolling="no"
                  onLoad={(e) => {
                    const frame = e.currentTarget;
                    const updateHeight = () => {
                      try {
                        if (frame.contentDocument?.documentElement) {
                          const doc = frame.contentDocument;
                          if (doc.body) {
                            doc.body.style.overflow = "hidden";
                          }
                          const h = Math.max(
                            doc.documentElement.scrollHeight,
                            doc.body?.scrollHeight ?? 0,
                            doc.documentElement.offsetHeight,
                          );
                          if (h > 400) {
                            setIframeHeight(h);
                          }
                        }
                      } catch {}
                    };
                    updateHeight();
                    frame.contentDocument?.fonts?.ready?.then(updateHeight);
                  }}
                  style={{ height: `${iframeHeight}px` }}
                  className="w-full border-0 bg-white transition-all duration-200 block"
                />
              </div>
            ) : (
              <div className="flex h-[42rem] flex-col items-center justify-center gap-3 rounded border border-dashed border-border text-center p-6 text-xs text-muted-foreground">
                <FileCheck className="h-10 w-10 text-muted-foreground/40" />
                <p>{t("review.previewUnavailable")}</p>
                {errors.length > 0 ? (
                  <p className="text-destructive font-medium">
                    {t("review.fixErrorsHint")}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unified Action Footer */}
      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          {onPrev && (
            <Button
              type="button"
              variant="secondary"
              onClick={onPrev}
              className="gap-1.5 text-xs sm:text-sm"
            >
              {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span>{tRoot("common.previous")}</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 ms-auto">
          {errors.length > 0 && (
            <span className="text-xs font-medium text-destructive">
              {t("review.fixErrorsHint")}
            </span>
          )}

          <Button
            type="button"
            disabled={errors.length > 0}
            onClick={() => setSendOpen(true)}
            className="gap-2 px-5 font-medium text-xs sm:text-sm shadow-xs"
          >
            <Send className="h-4 w-4" />
            <span>{t("review.send")}</span>
          </Button>
        </div>
      </div>

      <SendContractDialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        contractId={id}
        signers={sendContext.signers}
        languageMode={languageMode}
        clientDefaults={sendContext.clientDefaults}
        consentText={sendContext.consentText}
        requireProviderSignature={sendContext.requireProviderSignature}
      />
    </div>
  );
}
