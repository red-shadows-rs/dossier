import { getTranslations } from "next-intl/server";
import { ImageUploadField } from "@/components/forms/ImageUploadField";
import {
  SettingsForm,
  type SettingsFieldDef,
  type SettingsValues,
} from "@/components/forms/SettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { can } from "@/lib/permissions";
import {
  updateCompanyAction,
  uploadLogoAction,
  uploadStampAction,
} from "@/server/actions/settings";
import { requireUserPage } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings";

export default async function CompanySettingsPage() {
  const user = await requireUserPage();
  const canWrite = can(user, "settings.write");
  const t = await getTranslations("settings");
  const company = getSettings("company");

  const fields: SettingsFieldDef[] = [
    { kind: "text", name: "nameAr", label: t("fields.nameAr"), dir: "rtl" },
    { kind: "text", name: "nameEn", label: t("fields.nameEn"), dir: "ltr" },
    {
      kind: "text",
      name: "legalNameAr",
      label: t("fields.legalNameAr"),
      dir: "rtl",
    },
    {
      kind: "text",
      name: "legalNameEn",
      label: t("fields.legalNameEn"),
      dir: "ltr",
    },
    { kind: "text", name: "crNumber", label: t("fields.crNumber"), dir: "ltr" },
    {
      kind: "text",
      name: "taxNumber",
      label: t("fields.taxNumber"),
      dir: "ltr",
    },
    { kind: "text", name: "email", label: t("fields.email"), dir: "ltr" },
    { kind: "text", name: "phone", label: t("fields.phone"), dir: "ltr" },
    { kind: "text", name: "website", label: t("fields.website"), dir: "ltr" },
    {
      kind: "textarea",
      name: "addressAr",
      label: t("fields.addressAr"),
      dir: "rtl",
    },
    {
      kind: "textarea",
      name: "addressEn",
      label: t("fields.addressEn"),
      dir: "ltr",
    },
    {
      kind: "text",
      name: "bank.bankNameAr",
      label: t("fields.bankNameAr"),
      dir: "rtl",
    },
    {
      kind: "text",
      name: "bank.bankNameEn",
      label: t("fields.bankNameEn"),
      dir: "ltr",
    },
    {
      kind: "text",
      name: "bank.accountHolder",
      label: t("fields.accountHolder"),
    },
    { kind: "text", name: "bank.iban", label: t("fields.iban"), dir: "ltr" },
    { kind: "text", name: "bank.swift", label: t("fields.swift"), dir: "ltr" },
  ];

  const values: SettingsValues = {
    nameAr: company.nameAr,
    nameEn: company.nameEn,
    legalNameAr: company.legalNameAr,
    legalNameEn: company.legalNameEn,
    crNumber: company.crNumber,
    taxNumber: company.taxNumber,
    email: company.email,
    phone: company.phone,
    website: company.website,
    addressAr: company.addressAr,
    addressEn: company.addressEn,
    "bank.bankNameAr": company.bank.bankNameAr,
    "bank.bankNameEn": company.bank.bankNameEn,
    "bank.accountHolder": company.bank.accountHolder,
    "bank.iban": company.bank.iban,
    "bank.swift": company.bank.swift,
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("company")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ImageUploadField
              label={t("logo")}
              currentFileId={company.logoFileId}
              action={uploadLogoAction}
              disabled={!canWrite}
            />
            <ImageUploadField
              label={t("stamp")}
              currentFileId={company.stampFileId}
              action={uploadStampAction}
              disabled={!canWrite}
            />
          </div>
          <SettingsForm
            fields={fields}
            values={values}
            action={updateCompanyAction}
            disabled={!canWrite}
          />
        </CardContent>
      </Card>
    </div>
  );
}
