// Dossier - Templates New Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("templates");
  return {
    title: t("new"),
  };
}
import { ArrowLeft, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  TemplateForm,
  type TemplateFormValues,
} from "@/components/forms/TemplateForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { smoothLoading } from "@/lib/smooth-loader";

const EMPTY: TemplateFormValues = {
  type: "contract",
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  defaultLanguageMode: "ar",
  hasFees: true,
  titleAr: "",
  titleEn: "",
  paymentTermsDays: "",
  presetEnabled: false,
  presetMode: "percent",
  presetRows: [
    {
      titleAr: "",
      titleEn: "",
      percent: "",
      triggerNoteAr: "",
      triggerNoteEn: "",
    },
  ],
  clauses: [{ key: null, titleAr: "", titleEn: "", bodyAr: "", bodyEn: "" }],
};

export default async function NewTemplatePage() {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "templates.write");
  const t = await getTranslations("templates");
  const tc = await getTranslations("common");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href="/templates"
            className="hover:text-foreground transition-colors"
          >
            {t("title")}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium">{t("new")}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <FileCode2 size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("new")}
              </h1>
            </div>
          </div>

          <Link href="/templates">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5 font-medium shadow-xs"
            >
              <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
              <span>{tc("back")}</span>
            </Button>
          </Link>
        </div>
      </div>
      <TemplateForm mode="create" initial={EMPTY} />
    </div>
  );
}
