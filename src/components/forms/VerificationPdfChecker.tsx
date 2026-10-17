"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FileSearch, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { checkPdfAction } from "@/server/actions/verification";
import type { PdfCheckResult } from "@/server/services/verification";

async function fileToBase64(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function VerificationPdfChecker({ code }: { code: string }) {
  const t = useTranslations("verification");
  const tr = useTranslations();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfCheck, setPdfCheck] = useState<PdfCheckResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCheckPdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = pdfFile;
    if (!file) {
      setError(tr("errors.FILE_REJECTED"));
      return;
    }
    setPending(true);
    setError(null);
    setPdfCheck(null);
    try {
      const dataBase64 = await fileToBase64(file);
      const response = await checkPdfAction({ code, dataBase64 });
      setPending(false);
      if (!response.ok) {
        setError(tr(`errors.${response.error.code}`));
        return;
      }
      setPdfCheck(response.data.check);
    } catch {
      setPending(false);
      setError(tr("errors.VALIDATION_FAILED"));
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:p-6 shadow-sm">
      <form onSubmit={onCheckPdf} noValidate className="flex flex-col gap-3">
        <FileUpload
          label={t("pdfTitle")}
          hint={t("pdfHint")}
          accept="application/pdf"
          disabled={pending}
          pending={pending}
          onFileSelect={(file) => {
            setPdfFile(file);
            setPdfCheck(null);
            setError(null);
          }}
          onClear={() => {
            setPdfFile(null);
            setPdfCheck(null);
            setError(null);
          }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="secondary"
            loading={pending}
            disabled={!pdfFile || pending}
            className="gap-2 text-xs"
          >
            <FileSearch className="h-3.5 w-3.5" />
            {t("pdfCheck")}
          </Button>

          {error ? (
            <span role="alert" className="text-xs font-medium text-destructive">
              {error}
            </span>
          ) : null}

          {pdfCheck ? (
            <div
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                pdfCheck === "match"
                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/30"
                  : pdfCheck === "mismatch"
                    ? "bg-destructive/10 text-destructive border border-destructive/30"
                    : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {pdfCheck === "match" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : pdfCheck === "mismatch" ? (
                <ShieldAlert className="h-4 w-4 shrink-0 text-destructive" />
              ) : null}
              <span>{t(`pdfResult.${pdfCheck}`)}</span>
            </div>
          ) : null}
        </div>
      </form>
    </div>
  );
}

