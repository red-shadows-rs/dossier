import { getTranslations } from "next-intl/server";
import {
  SettingsForm,
  type SettingsFieldDef,
  type SettingsValues,
} from "@/components/forms/SettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CURRENCIES, LANG_MODES } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { updateDefaultsAction } from "@/server/actions/settings";
import { requireUserPage } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings";

export default async function DefaultsSettingsPage() {
  const user = await requireUserPage();
  const canWrite = can(user, "settings.write");
  const t = await getTranslations("settings");
  const defaults = getSettings("defaults");

  const fields: SettingsFieldDef[] = [
    {
      kind: "text",
      name: "country",
      label: t("fields.country"),
      dir: "ltr",
      maxLength: 2,
    },
    { kind: "text", name: "timezone", label: t("fields.timezone"), dir: "ltr" },
    {
      kind: "select",
      name: "currency",
      label: t("fields.currency"),
      options: Object.keys(CURRENCIES).map((code) => ({
        value: code,
        label: code,
      })),
    },
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
    {
      kind: "select",
      name: "languageMode",
      label: t("fields.languageMode"),
      options: LANG_MODES.map((mode) => ({
        value: mode,
        label: t(`languageModes.${mode}`),
      })),
    },
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
    <Card>
      <CardHeader>
        <CardTitle>{t("defaults")}</CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsForm
          fields={fields}
          values={values}
          action={updateDefaultsAction}
          disabled={!canWrite}
        />
      </CardContent>
    </Card>
  );
}
