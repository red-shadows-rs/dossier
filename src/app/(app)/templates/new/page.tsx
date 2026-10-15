import { getTranslations } from "next-intl/server";
import { FileCode2 } from "lucide-react";
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
  defaultLanguageMode: "bilingual",
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

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <FileCode2 size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("new")}</h1>
          </div>
        </div>
      </div>
      <TemplateForm mode="create" initial={EMPTY} />
    </div>
  );
}
