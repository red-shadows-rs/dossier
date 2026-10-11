"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  checkPdfAction,
  verifyCodeAction,
} from "@/server/actions/verification";
import type {
  PdfCheckResult,
  VerificationResult,
} from "@/server/services/verification";

async function fileToBase64(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function VerificationForm({ initialCode }: { initialCode?: string }) {
  const t = useTranslations("verification");
  const tr = useTranslations();
  const locale = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState(initialCode ?? "");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [checked, setChecked] = useState(false);
  const [pdfCheck, setPdfCheck] = useState<PdfCheckResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setPdfCheck(null);
    const response = await verifyCodeAction({ code });
    setPending(false);
    if (!response.ok) {
      setError(tr(`errors.${response.error.code}`));
      return;
    }
    setResult(response.data);
    setChecked(true);
  }

  async function onCheckPdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError(tr("errors.FILE_REJECTED"));
      return;
    }
    setPending(true);
    setError(null);
    const dataBase64 = await fileToBase64(file);
    const response = await checkPdfAction({ code, dataBase64 });
    setPending(false);
    if (!response.ok) {
      setError(tr(`errors.${response.error.code}`));
      return;
    }
    setPdfCheck(response.data.check);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onLookup} className="flex items-end gap-2">
        <Field label={t("codeLabel")} htmlFor="verify-code" className="flex-1">
          <Input
            id="verify-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            dir="ltr"
            className="font-mono uppercase"
            placeholder="XXXX-XXXX-XXXX"
            disabled={pending}
            required
          />
        </Field>
        <Button type="submit" loading={pending}>
          {t("verify")}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {checked ? (
        result === null ? (
          <p
            role="status"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
          >
            {t("notFound")}
          </p>
        ) : (
          <div
            role="status"
            className="rounded-md border border-success/40 bg-success/10 p-4 text-sm text-foreground"
          >
            <p className="font-medium">{t("found")}</p>
            <p className="mt-1 text-muted-foreground">
              {result.kind === "contract"
                ? `${t("contract.heading")}: ${result.number ?? "—"}`
                : `${t("invoice.heading")}: ${result.number ?? "—"} · ${result.totalFormatted}`}
            </p>
            <a
              href={`/v/${code}?lang=${locale}`}
              className="mt-2 inline-block text-primary underline"
            >
              {t("viewDetails")}
            </a>
          </div>
        )
      ) : null}

      <form
        onSubmit={onCheckPdf}
        className="flex flex-col gap-3 rounded-md border border-border p-4"
      >
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            {t("pdfTitle")}
          </span>
          <span className="text-xs text-muted-foreground">{t("pdfHint")}</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          disabled={pending}
          className="block w-full text-xs text-muted-foreground file:me-2 file:rounded-md file:border file:border-border file:bg-surface file:px-2 file:py-1 file:text-foreground"
        />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" loading={pending}>
            {t("pdfCheck")}
          </Button>
          {pdfCheck ? (
            <span
              className={
                pdfCheck === "match"
                  ? "text-sm font-medium text-success"
                  : pdfCheck === "mismatch"
                    ? "text-sm font-medium text-destructive"
                    : "text-sm text-muted-foreground"
              }
            >
              {t(`pdfResult.${pdfCheck}`)}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
