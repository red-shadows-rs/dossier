// Dossier - Verification Form Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertOctagon,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  FileX,
  Receipt,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { VerificationPdfChecker } from "@/components/forms/VerificationPdfChecker";
import { verifyCodeAction } from "@/server/actions/verification";
import type { VerificationResult } from "@/server/services/verification";

export function VerificationForm({ initialCode }: { initialCode?: string }) {
  const t = useTranslations("verification");
  const tr = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [code, setCode] = useState(initialCode ?? "");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [checkedCode, setCheckedCode] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function performLookup(lookupCode: string) {
    const trimmed = lookupCode.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    try {
      const response = await verifyCodeAction({ code: trimmed, locale });
      setPending(false);
      if (!response.ok) {
        setError(tr(`errors.${response.error.code}`));
        return;
      }
      setResult(response.data);
      setCheckedCode(trimmed);
      setChecked(true);
    } catch {
      setPending(false);
      setError(tr("errors.VALIDATION_FAILED"));
    }
  }

  useEffect(() => {
    if (initialCode && initialCode.trim().length > 0) {
      performLookup(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  async function onLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performLookup(code);
  }

  const isValid = result !== null && result.state === "valid";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-card p-5 sm:p-6 shadow-sm">
        <form onSubmit={onLookup} noValidate className="flex flex-col sm:flex-row items-end gap-3">
          <Field label={t("codeLabel")} htmlFor="verify-code" className="w-full flex-1">
            <div className="relative">
              <Input
                id="verify-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                dir="ltr"
                className="font-mono uppercase tracking-wider text-base h-11"
                placeholder="XXXX-XXXX-XXXX"
                disabled={pending}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </Field>
          <Button
            type="submit"
            loading={pending}
            disabled={pending || !code.trim()}
            className="w-full sm:w-auto h-11 px-6 gap-2 text-sm font-semibold shrink-0"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{t("verify")}</span>
          </Button>
        </form>

        {error ? (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          >
            <AlertOctagon className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      {checked ? (
        result === null ? (
          <div
            role="status"
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/60 p-8 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-destructive/10 text-destructive ring-2 ring-destructive/10">
              <FileX className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">{t("notFound")}</h3>
            <p className="max-w-sm text-xs text-muted-foreground">
              {isAr
                ? "لم يتم العثور على مستند مطابق. تأكد من صحة الرمز المدخل."
                : "No matching document found. Check the code and try again."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="relative overflow-hidden flex flex-col gap-5 rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/80 via-primary to-rose-400" />
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {result.kind === "contract" ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <Receipt className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {result.kind === "contract"
                        ? t("contract.heading")
                        : t("invoice.heading")}
                    </div>
                    <div className="font-mono text-base font-bold text-foreground" dir="ltr">
                      {result.number ?? "-"}
                    </div>
                  </div>
                </div>

                <Badge
                  tone={isValid ? "green" : "red"}
                  className="gap-1.5 px-3 py-1 text-xs font-semibold"
                >
                  {isValid ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  <span>{t(`states.${result.state}`) ?? result.state}</span>
                </Badge>
              </div>

              {result.kind === "contract" ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-md border border-border/70 bg-muted/30 p-3.5">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t("fields.title")}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-foreground">
                      {(isAr ? result.titleAr ?? result.titleEn : result.titleEn ?? result.titleAr) ?? "-"}
                    </div>
                  </div>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{t("fields.provider")}</span>
                      </dt>
                      <dd className="text-xs font-semibold text-foreground">
                        {result.providerName ?? "-"}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>{t("fields.client")}</span>
                      </dt>
                      <dd className="text-xs font-semibold text-foreground">
                        {result.clientName ?? "-"}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {t("fields.total")}
                    </div>
                    <div className="mt-1 font-mono text-2xl font-bold text-foreground" dir="ltr">
                      {result.totalFormatted}
                    </div>
                  </div>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{t("fields.issuer")}</span>
                      </dt>
                      <dd className="text-xs font-semibold text-foreground">
                        {result.issuerName ?? "-"}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{t("fields.issueDate")}</span>
                      </dt>
                      <dd className="font-mono text-xs font-semibold text-foreground" dir="ltr">
                        {result.issueDate ?? "-"}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href={`/v/${checkedCode ?? code}?lang=${locale}`}
                  className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors no-underline shadow-sm"
                >
                  <span>{t("viewDetails")}</span>
                  {isAr ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </Link>
              </div>
            </div>

            {checkedCode ? (
              <VerificationPdfChecker code={checkedCode} />
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}

