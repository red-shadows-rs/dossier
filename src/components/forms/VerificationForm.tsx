"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileSearch, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FileUpload } from "@/components/ui/FileUpload";
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

  const [code, setCode] = useState(initialCode ?? "");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [checked, setChecked] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
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
    const file = pdfFile;
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
      <form onSubmit={onLookup} noValidate className="flex items-end gap-2">
        <Field label={t("codeLabel")} htmlFor="verify-code" className="flex-1">
          <Input
            id="verify-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            dir="ltr"
            className="font-mono uppercase"
            placeholder="XXXX-XXXX-XXXX"
            disabled={pending}
          />
        </Field>
        <Button type="submit" loading={pending} className="gap-2">
          <ShieldCheck className="h-4 w-4" />
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
            className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
          >
            {t("notFound")}
          </p>
        ) : (
          <div
            role="status"
            className="rounded border border-success/40 bg-success/10 p-4 text-sm text-foreground"
          >
            <p className="font-medium">{t("found")}</p>
            <p className="mt-1 text-muted-foreground">
              {result.kind === "contract"
                ? `${t("contract.heading")}: ${result.number ?? "-"}`
                : `${t("invoice.heading")}: ${result.number ?? "-"} · ${result.totalFormatted}`}
            </p>
            <a
              href={`/v/${code}?lang=${locale}`}
              className="mt-2 inline-block text-primary hover:underline"
            >
              {t("viewDetails")}
            </a>
          </div>
        )
      ) : null}

      <form
        onSubmit={onCheckPdf}
        noValidate
        className="flex flex-col gap-3 rounded border border-border bg-card p-4"
      >
        <FileUpload
          label={t("pdfTitle")}
          hint={t("pdfHint")}
          accept="application/pdf"
          disabled={pending}
          pending={pending}
          onFileSelect={(file) => {
            setPdfFile(file);
          }}
          onClear={() => {
            setPdfFile(null);
          }}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" loading={pending} className="gap-2">
            <FileSearch className="h-4 w-4" />
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
