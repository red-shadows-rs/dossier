"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Eye, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DocumentSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/components/ui/cn";
import {
  allowedDocLangs,
  defaultDocLang,
  type DocLang,
  type LanguageMode,
} from "@/lib/doc-lang";
import {
  getInvoicePreviewHtmlAction,
  getReceiptPreviewHtmlAction,
} from "@/server/actions/invoices";

export function InvoiceDocumentViewer({
  id,
  languageMode,
  canDownload,
  hasPayments,
}: {
  id: string;
  languageMode: LanguageMode;
  canDownload: boolean;
  hasPayments?: boolean;
}) {
  const t = useTranslations("invoices");
  const langs = allowedDocLangs(languageMode);
  const [lang, setLang] = useState<DocLang>(defaultDocLang(languageMode));
  const [docType, setDocType] = useState<"invoice" | "receipt">("invoice");
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const fetchHtml =
      docType === "receipt"
        ? getReceiptPreviewHtmlAction({ id, lang })
        : getInvoicePreviewHtmlAction({ id, lang });

    fetchHtml.then((result) => {
      if (!active) return;
      setLoading(false);
      setHtml(result.ok ? result.data.html : null);
    });
    return () => {
      active = false;
    };
  }, [id, lang, docType]);

  const [iframeHeight, setIframeHeight] = useState<number>(1125);

  const previewUrl =
    docType === "receipt"
      ? `/api/invoices/${id}/receipt/pdf?lang=${lang}&inline=1`
      : `/api/invoices/${id}/pdf?lang=${lang}&inline=1`;

  const downloadUrl =
    docType === "receipt"
      ? `/api/invoices/${id}/receipt/pdf?lang=${lang}`
      : `/api/invoices/${id}/pdf?lang=${lang}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {hasPayments ? (
            <div
              role="tablist"
              className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={docType === "invoice"}
                onClick={() => setDocType("invoice")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  docType === "invoice"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{t("tabInvoice")}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={docType === "receipt"}
                onClick={() => setDocType("receipt")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  docType === "receipt"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>{t("tabReceipt")}</span>
              </button>
            </div>
          ) : null}

          {langs.length > 1 ? (
            <div className="flex gap-1">
              {langs.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-current={value === lang ? "true" : undefined}
                  onClick={() => setLang(value)}
                  className={cn(
                    "rounded border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
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
        </div>

        {canDownload ? (
          <div className="flex gap-2">
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary" size="sm" className="gap-1.5">
                <Eye className="h-4 w-4" />
                {t("previewPdf")}
              </Button>
            </a>
            <a href={downloadUrl}>
              <Button type="button" variant="secondary" size="sm" className="gap-1.5">
                <Download className="h-4 w-4" />
                {t("downloadPdf")}
              </Button>
            </a>
          </div>
        ) : null}
      </div>

      {loading ? (
        <DocumentSkeleton />
      ) : html ? (
        <div className="w-full overflow-x-auto touch-pan-x [scrollbar-width:thin] rounded-md border border-border bg-white shadow-2xs">
          <iframe
            title={t("summary")}
            sandbox="allow-same-origin"
            srcDoc={html}
            scrolling="no"
            onLoad={(e) => {
              try {
                const frame = e.currentTarget;
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
              } catch {
              }
            }}
            style={{ height: `${iframeHeight}px` }}
            className="w-full min-w-[620px] sm:min-w-full border-0 bg-white transition-all duration-200 block"
          />
        </div>
      ) : (
        <div className="flex min-h-[44rem] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
          {t("documentUnavailable")}
        </div>
      )}
    </div>
  );
}
