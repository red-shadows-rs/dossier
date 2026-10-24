// Dossier - Contract Document Viewer Forms Component
// https://github.com/red-shadows-rs/dossier

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
          <div
            role="tablist"
            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1"
          >
            {langs.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={value === lang}
                onClick={() => setLang(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  value === lang
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                <span>{t(`languageModes.${value}`)}</span>
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        {canDownload ? (
          <div className="flex gap-2">
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary" size="sm" className="gap-1.5 font-medium shadow-xs">
                <Eye className="h-4 w-4" />
                <span>{t("previewPdf")}</span>
              </Button>
            </a>
            <a href={downloadUrl}>
              <Button type="button" variant="secondary" size="sm" className="gap-1.5 font-medium shadow-xs">
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
        <div className="w-full overflow-x-auto touch-pan-x [scrollbar-width:thin] rounded-lg border border-border bg-white shadow-2xs overflow-hidden">
          <iframe
            title={t("document")}
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
                    const pages = Array.from(doc.querySelectorAll<HTMLElement>(".contract-page, .invoice-page"));
                    let h = 0;
                    if (pages.length > 0) {
                      const lastPage = pages[pages.length - 1];
                      const lastBar = lastPage?.querySelector<HTMLElement>(".bottom-red-bar");
                      const target = lastBar || lastPage;
                      if (target) {
                        h = Math.ceil(target.getBoundingClientRect().bottom + (doc.defaultView?.scrollY ?? 0));
                      }
                    }
                    if (!h || h < 200) {
                      h = Math.max(
                        doc.documentElement.scrollHeight,
                        doc.body?.scrollHeight ?? 0,
                        doc.documentElement.offsetHeight,
                      );
                    }
                    if (h > 200) {
                      setIframeHeight(h);
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
