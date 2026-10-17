"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DocumentSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/components/ui/cn";
import type { DocLang } from "@/lib/doc-lang";
import { getTemplatePreviewHtmlAction } from "@/server/actions/templates";
import type { PreviewClause } from "@/server/templating/preview";

export function TemplateDocumentViewer({
  clauses,
  initialHtml,
  defaultLang = "ar",
  templateTitleAr,
  templateTitleEn,
  hasFees,
  paymentTermsDays,
}: {
  clauses: PreviewClause[];
  initialHtml?: string | null;
  defaultLang?: DocLang;
  templateTitleAr?: string;
  templateTitleEn?: string;
  hasFees?: boolean;
  paymentTermsDays?: number;
}) {
  const t = useTranslations("contracts");
  const tTemplates = useTranslations("templates");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [lang, setLang] = useState<DocLang>(defaultLang);
  const [html, setHtml] = useState<string | null>(initialHtml ?? null);
  const [loading, setLoading] = useState(false);
  const [iframeHeight, setIframeHeight] = useState<number>(650);

  const langs: DocLang[] = ["ar", "en", "bilingual"];

  useEffect(() => {
    let active = true;
    setLoading(true);
    getTemplatePreviewHtmlAction({
      clauses,
      lang,
      titleAr: templateTitleAr,
      titleEn: templateTitleEn,
      hasFees,
      paymentTermsDays,
    }).then((result) => {
      if (!active) return;
      setLoading(false);
      if (result.ok) {
        setHtml(result.data.html);
      }
    });
    return () => {
      active = false;
    };
  }, [lang, clauses, templateTitleAr, templateTitleEn, hasFees, paymentTermsDays]);

  function refresh() {
    setLoading(true);
    getTemplatePreviewHtmlAction({
      clauses,
      lang,
      titleAr: templateTitleAr,
      titleEn: templateTitleEn,
      hasFees,
      paymentTermsDays,
    }).then((result) => {
      setLoading(false);
      if (result.ok) {
        setHtml(result.data.html);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground me-1">
            {tTemplates("previewLanguage")}:
          </span>
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
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                {t(`languageModes.${value}`)}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          <span>
            {loading
              ? isAr
                ? "جار التحديث..."
                : "Refreshing..."
              : isAr
                ? "تحديث المعاينة"
                : "Refresh preview"}
          </span>
        </Button>
      </div>

      {loading ? (
        <DocumentSkeleton />
      ) : html ? (
        <div className="w-full overflow-x-auto touch-pan-x [scrollbar-width:thin] rounded-lg border border-border bg-white shadow-2xs overflow-hidden">
          <iframe
            title={tTemplates("previewTitle")}
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
                    const redBar = doc.querySelector(
                      ".bottom-red-bar",
                    ) as HTMLElement | null;
                    let h = 0;
                    if (redBar) {
                      h = redBar.offsetTop + redBar.offsetHeight;
                    } else {
                      const container =
                        doc.querySelector(".contract-document") ||
                        doc.querySelector(".invoice-page") ||
                        doc.body;
                      h = Math.ceil(
                        container?.getBoundingClientRect().height ||
                          doc.body?.scrollHeight ||
                          600,
                      );
                    }
                    if (h > 0) {
                      setIframeHeight(Math.max(h, 400));
                    }
                  }
                } catch {}
              };
              updateHeight();
              frame.contentDocument?.fonts?.ready?.then(updateHeight);
            }}
            style={{ height: `${iframeHeight}px` }}
            className="w-full min-w-[620px] sm:min-w-full border-0 bg-white transition-all duration-200 block"
          />
        </div>
      ) : (
        <div className="flex min-h-[30rem] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          {t("documentUnavailable")}
        </div>
      )}
    </div>
  );
}

