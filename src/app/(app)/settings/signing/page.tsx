import { getTranslations } from "next-intl/server";
import {
  SettingsForm,
  type SettingsFieldDef,
  type SettingsSectionDef,
  type SettingsValues,
} from "@/components/forms/SettingsForm";
import { can } from "@/lib/permissions";
import { updateSigningAction } from "@/server/actions/settings";
import { requireUserPage } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings";

export default async function SigningSettingsPage() {
  const user = await requireUserPage();
  const canWrite = can(user, "settings.write");
  const t = await getTranslations("settings");
  const signing = getSettings("signing");

  const policyFields: SettingsFieldDef[] = [
    {
      kind: "number",
      name: "linkTtlDays",
      label: t("fields.linkTtlDays"),
      min: 1,
      max: 90,
      suffix: t("fields.daysSuffix"),
    },
    {
      kind: "checkbox",
      name: "requireProviderSignatureBeforeSend",
      label: t("fields.requireProviderSignatureBeforeSend"),
    },
    {
      kind: "checkbox",
      name: "requireEmailOtp",
      label: t("fields.requireEmailOtp"),
    },
  ];

  const consentFields: SettingsFieldDef[] = [
    {
      kind: "textarea",
      name: "consentTextAr",
      label: t("fields.consentTextAr"),
      dir: "rtl",
      rows: 3,
    },
    {
      kind: "textarea",
      name: "consentTextEn",
      label: t("fields.consentTextEn"),
      dir: "ltr",
      rows: 3,
    },
  ];

  const sections: SettingsSectionDef[] = [
    {
      title: t("signingSecurity"),
      description: t("signingSecurityDesc"),
      icon: "signature",
      fields: policyFields,
    },
    {
      title: t("consentText"),
      description: t("consentTextDesc"),
      icon: "scroll",
      fields: consentFields,
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
    <SettingsForm
      sections={sections}
      values={values}
      action={updateSigningAction}
      disabled={!canWrite}
    />
  );
}
