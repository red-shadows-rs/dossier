import { getTranslations } from "next-intl/server";
import {
  TemplateForm,
  type TemplateFormValues,
} from "@/components/forms/TemplateForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";

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
  const user = await requireUserPage();
  assertCan(user, "templates.write");
  const t = await getTranslations("templates");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{t("new")}</h1>
      <TemplateForm mode="create" initial={EMPTY} />
    </div>
  );
}
