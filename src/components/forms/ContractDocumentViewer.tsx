"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
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
        ) : (
          <span />
        )}

        {canDownload ? (
          <div className="flex gap-2">
            <a
              href={`/api/contracts/${id}/pdf?lang=${lang}&inline=1`}
              target="_blank"
              rel="noreferrer"
            >
              <Button type="button" variant="secondary" size="sm">
                {t("previewPdf")}
              </Button>
            </a>
            <a href={`/api/contracts/${id}/pdf?lang=${lang}`}>
              <Button type="button" variant="secondary" size="sm">
                {t("downloadPdf")}
              </Button>
            </a>
          </div>
        ) : null}
      </div>

      {html ? (
        <iframe
          title={t("document")}
          sandbox=""
          srcDoc={html}
          className="h-[44rem] w-full rounded-md border border-border bg-white"
        />
      ) : (
        <div className="flex h-[44rem] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
          {loading ? t("documentLoading") : t("documentUnavailable")}
        </div>
      )}
    </div>
  );
}
