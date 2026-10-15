"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
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
}: {
  id: string;
  languageMode: LanguageMode;
  issues: Issue[];
  sendContext: SendContext;
  onJump: (step: BuilderStep) => void;
}) {
  const t = useTranslations("contracts");
  const tRoot = useTranslations();
  const langs = allowedDocLangs(languageMode);
  const [lang, setLang] = useState<DocLang>(defaultDocLang(languageMode));
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

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

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  function renderIssue(issue: Issue, index: number) {
    return (
      <li
        key={`${issue.code}-${index}`}
        className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
      >
        <span
          className={
            issue.severity === "error" ? "text-destructive" : "text-warning"
          }
        >
          {tRoot(issue.messageKey, issue.params)}
        </span>
        <button
          type="button"
          onClick={() => onJump(stepForField(issue.field))}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          {t("review.jump")}
        </button>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("review.issuesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {errors.length === 0 && warnings.length === 0 ? (
            <p className="text-sm text-success">{t("review.noIssues")}</p>
          ) : null}

          {errors.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-destructive">
                {t("review.errors")}
              </h3>
              <ul className="flex flex-col gap-2">{errors.map(renderIssue)}</ul>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-warning">
                {t("review.warnings")}
              </h3>
              <ul className="flex flex-col gap-2">
                {warnings.map(renderIssue)}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("review.previewTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {langs.length > 1 ? (
            <div className="flex gap-1">
              {langs.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-current={value === lang ? "true" : undefined}
                  onClick={() => setLang(value)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    value === lang
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`languageModes.${value}`)}
                </button>
              ))}
            </div>
          ) : null}

          {loading ? (
            <DocumentSkeleton className="h-[40rem]" />
          ) : html ? (
            <iframe
              title={t("review.previewTitle")}
              sandbox=""
              srcDoc={html}
              className="h-[40rem] w-full rounded-md border border-border bg-white"
            />
          ) : (
            <div className="flex h-[40rem] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
              {t("review.previewUnavailable")}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {errors.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("review.fixErrorsHint")}
          </p>
        ) : null}
        <Button
          type="button"
          disabled={errors.length > 0}
          onClick={() => setSendOpen(true)}
          className="gap-1.5"
        >
          <Send size={15} aria-hidden="true" />
          <span>{t("review.send")}</span>
        </Button>
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
