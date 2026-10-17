"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DocumentSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/components/ui/cn";
import {
  allowedDocLangs,
  defaultDocLang,
  type DocLang,
  type LanguageMode,
} from "@/lib/doc-lang";
import { getContractPreviewHtmlAction } from "@/server/actions/contracts";

export function ContractDocumentViewer({
  id,
  languageMode,
  canDownload,
}: {
  id: string;
  languageMode: LanguageMode;
  canDownload: boolean;
}) {
  const t = useTranslations("contracts");
  const langs = allowedDocLangs(languageMode);
  const [lang, setLang] = useState<DocLang>(defaultDocLang(languageMode));
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [iframeHeight, setIframeHeight] = useState<number>(600);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getContractPreviewHtmlAction({ id, lang }).then((result) => {
      if (!active) return;
      setLoading(false);
      setHtml(result.ok ? result.data.html : null);
    });
    return () => {
      active = false;
    };
  }, [id, lang]);

  const previewUrl = `/api/contracts/${id}/pdf?lang=${lang}&inline=1`;
  const downloadUrl = `/api/contracts/${id}/pdf?lang=${lang}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {langs.length > 1 ? (
          <div className="flex gap-1">
            {langs.map((value) => (
              <button
                key={value}
                type="button"
                aria-current={value === lang ? "true" : undefined}
                onClick={() => setLang(value)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                  value === lang
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`languageModes.${value}`)}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        {canDownload ? (
          <div className="flex gap-2">
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary" size="sm" className="gap-1.5">
                <Eye className="h-4 w-4" />
                <span>{t("previewPdf")}</span>
              </Button>
            </a>
            <a href={downloadUrl}>
              <Button type="button" variant="secondary" size="sm" className="gap-1.5">
                <Download className="h-4 w-4" />
                <span>{t("downloadPdf")}</span>
              </Button>
            </a>
          </div>
        ) : null}
      </div>

      {loading ? (
        <DocumentSkeleton />
      ) : html ? (
        <div className="w-full overflow-x-auto touch-pan-x [scrollbar-width:thin] rounded-md border border-border bg-white shadow-2xs overflow-hidden">
          <iframe
            title={t("document")}
            sandbox="allow-same-origin"
            srcDoc={html}
            scrolling="no"
            onLoad={(e) => {
              const frame = e.currentTarget;
              const updateHeight = () => {
                try {
                  if (frame.contentDocument) {
                    const doc = frame.contentDocument;
                    if (doc.body) {
                      doc.body.style.overflow = "hidden";
                    }
                    const redBar = doc.querySelector(".bottom-red-bar") as HTMLElement | null;
                    let h = 0;
                    if (redBar) {
                      h = redBar.offsetTop + redBar.offsetHeight;
                    } else {
                      const container =
                        doc.querySelector(".contract-document") ||
                        doc.querySelector(".invoice-page") ||
                        doc.body;
                      h = Math.ceil(container?.getBoundingClientRect().height || doc.body?.scrollHeight || 500);
                    }
                    if (h > 0) {
                      setIframeHeight(Math.max(h, 300));
                    }
                  }
                } catch {
                }
              };
              updateHeight();
              frame.contentDocument?.fonts?.ready?.then(updateHeight);
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
