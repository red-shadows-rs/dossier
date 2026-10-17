// Dossier - Settings Defaults Page
// https://github.com/red-shadows-rs/dossier

import { getTranslations } from "next-intl/server";
import {
  SettingsForm,
  type SettingsFieldDef,
  type SettingsSectionDef,
  type SettingsValues,
} from "@/components/forms/SettingsForm";
import { GENERAL_LANG_MODES } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { updateDefaultsAction } from "@/server/actions/settings";
import { requireUserPage } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings";

export default async function DefaultsSettingsPage() {
  const user = await requireUserPage();
  const canWrite = can(user, "settings.write");
  const t = await getTranslations("settings");
  const defaults = getSettings("defaults");

  const regionalFields: SettingsFieldDef[] = [
    {
      kind: "select",
      name: "country",
      label: t("fields.country"),
      options: [
        { value: "SA", label: "المملكة العربية السعودية (SA)" },
        { value: "AE", label: "الإمارات العربية المتحدة (AE)" },
        { value: "QA", label: "قطر (QA)" },
        { value: "KW", label: "الكويت (KW)" },
        { value: "BH", label: "البحرين (BH)" },
        { value: "OM", label: "سلطنة عمان (OM)" },
        { value: "EG", label: "مصر (EG)" },
        { value: "JO", label: "الأردن (JO)" },
        { value: "US", label: "الولايات المتحدة (US)" },
        { value: "GB", label: "المملكة المتحدة (GB)" },
      ],
    },
    {
      kind: "select",
      name: "timezone",
      label: t("fields.timezone"),
      options: [
        { value: "Asia/Riyadh", label: "توقيت السعودية - الرياض (GMT+3)" },
        { value: "Asia/Dubai", label: "توقيت الإمارات - دبي (GMT+4)" },
        { value: "Asia/Kuwait", label: "توقيت الكويت (GMT+3)" },
        { value: "Asia/Qatar", label: "توقيت قطر (GMT+3)" },
        { value: "Asia/Bahrain", label: "توقيت البحرين (GMT+3)" },
        { value: "Africa/Cairo", label: "توقيت مصر - القاهرة (GMT+2)" },
        { value: "UTC", label: "التوقيت العالمي الموحد (UTC)" },
      ],
    },
    {
      kind: "select",
      name: "currency",
      label: t("fields.currency"),
      options: [
        { value: "SAR", label: "SAR - ريال سعودي" },
        { value: "AED", label: "AED - درهم إماراتي" },
        { value: "USD", label: "USD - دولار أمريكي" },
        { value: "EUR", label: "EUR - يورو" },
        { value: "QAR", label: "QAR - ريال قطري" },
        { value: "KWD", label: "KWD - دينار كويتي" },
        { value: "BHD", label: "BHD - دينار بحريني" },
        { value: "OMR", label: "OMR - ريال عماني" },
        { value: "JOD", label: "JOD - دينار أردني" },
        { value: "EGP", label: "EGP - جنيه مصري" },
        { value: "GBP", label: "GBP - جنيه إسترليني" },
      ],
    },
    {
      kind: "select",
      name: "languageMode",
      label: t("fields.languageMode"),
      options: GENERAL_LANG_MODES.map((mode) => ({
        value: mode,
        label: t(`languageModes.${mode}`),
      })),
    },
  ];

  const financialFields: SettingsFieldDef[] = [
    {
      kind: "number",
      name: "taxRatePercent",
      label: t("fields.taxRate"),
      min: 0,
      max: 100,
      step: 0.01,
      suffix: "%",
    },
    {
      kind: "number",
      name: "paymentTermsDays",
      label: t("fields.paymentTermsDays"),
      min: 0,
      max: 365,
    },
  ];

  const legalFields: SettingsFieldDef[] = [
    {
      kind: "text",
      name: "governingLawAr",
      label: t("fields.governingLawAr"),
      dir: "rtl",
    },
    {
      kind: "text",
      name: "governingLawEn",
      label: t("fields.governingLawEn"),
      dir: "ltr",
    },
    {
      kind: "text",
      name: "jurisdictionAr",
      label: t("fields.jurisdictionAr"),
      dir: "rtl",
    },
    {
      kind: "text",
      name: "jurisdictionEn",
      label: t("fields.jurisdictionEn"),
      dir: "ltr",
    },
  ];

  const sections: SettingsSectionDef[] = [
    {
      title: t("regionalInfo"),
      description: t("regionalInfoDesc"),
      icon: "globe",
      fields: regionalFields,
    },
    {
      title: t("financialTerms"),
      description: t("financialTermsDesc"),
      icon: "percent",
      fields: financialFields,
    },
    {
      title: t("legalInfo"),
      description: t("legalInfoDesc"),
      icon: "scale",
      fields: legalFields,
    },
  ];

  const values: SettingsValues = {
    country: defaults.country,
    timezone: defaults.timezone,
    currency: defaults.currency,
    taxRatePercent: defaults.taxRateBp / 100,
    paymentTermsDays: defaults.paymentTermsDays,
    languageMode: defaults.languageMode,
    governingLawAr: defaults.governingLawAr,
    governingLawEn: defaults.governingLawEn,
    jurisdictionAr: defaults.jurisdictionAr,
    jurisdictionEn: defaults.jurisdictionEn,
  };

  return (
    <SettingsForm
      sections={sections}
      values={values}
      action={updateDefaultsAction}
      disabled={!canWrite}
    />
  );
}
