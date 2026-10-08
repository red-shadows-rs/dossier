import { getTranslations } from "next-intl/server";
import {
  SettingsForm,
  type SettingsFieldDef,
  type SettingsValues,
} from "@/components/forms/SettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { can } from "@/lib/permissions";
import { updateSigningAction } from "@/server/actions/settings";
import { requireUserPage } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings";

export default async function SigningSettingsPage() {
  const user = await requireUserPage();
  const canWrite = can(user, "settings.write");
  const t = await getTranslations("settings");
  const signing = getSettings("signing");

  const fields: SettingsFieldDef[] = [
    {
      kind: "number",
      name: "linkTtlDays",
      label: t("fields.linkTtlDays"),
      min: 1,
      max: 90,
    },
    {
      kind: "checkbox",
      name: "requireEmailOtp",
      label: t("fields.requireEmailOtp"),
    },
    {
      kind: "checkbox",
      name: "requireProviderSignatureBeforeSend",
      label: t("fields.requireProviderSignatureBeforeSend"),
    },
    {
      kind: "textarea",
      name: "consentTextEn",
      label: t("fields.consentTextEn"),
      dir: "ltr",
    },
    {
      kind: "textarea",
      name: "consentTextAr",
      label: t("fields.consentTextAr"),
      dir: "rtl",
    },
  ];

  const values: SettingsValues = {
    linkTtlDays: signing.linkTtlDays,
    requireEmailOtp: signing.requireEmailOtp,
    requireProviderSignatureBeforeSend:
      signing.requireProviderSignatureBeforeSend,
    consentTextEn: signing.consentTextEn,
    consentTextAr: signing.consentTextAr,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("signing")}</CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsForm
          fields={fields}
          values={values}
          action={updateSigningAction}
          disabled={!canWrite}
        />
      </CardContent>
    </Card>
  );
}
