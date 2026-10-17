// Dossier - Settings Company Page
// https://github.com/red-shadows-rs/dossier

import { getTranslations } from "next-intl/server";
import { Palette } from "lucide-react";
import { ImageUploadField } from "@/components/forms/ImageUploadField";
import { BankAccountsManager } from "@/components/forms/BankAccountsManager";
import {
  SettingsForm,
  type SettingsFieldDef,
  type SettingsSectionDef,
  type SettingsValues,
} from "@/components/forms/SettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { can } from "@/lib/permissions";
import {
  deleteLogoAction,
  deleteStampAction,
  updateCompanyAction,
  uploadLogoAction,
  uploadStampAction,
} from "@/server/actions/settings";
import { requireUserPage } from "@/server/auth/require-user";
import { getCompanyBankAccounts, getSettings } from "@/server/services/settings";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function CompanySettingsPage() {
  await smoothLoading();
  const user = await requireUserPage();
  const canWrite = can(user, "settings.write");
  const t = await getTranslations("settings");
  const company = getSettings("company");
  const bankAccounts = getCompanyBankAccounts(company);

  const companyFields: SettingsFieldDef[] = [
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
  ];

  const sections: SettingsSectionDef[] = [
    {
      title: t("companyInfo"),
      icon: "building",
      fields: companyFields,
    },
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
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2.5">
            <Palette size={18} className="text-primary" aria-hidden="true" />
            <span>{t("branding")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ImageUploadField
              label={t("logo")}
              currentFileId={company.logoFileId}
              action={uploadLogoAction}
              deleteAction={deleteLogoAction}
              disabled={!canWrite}
            />
            <ImageUploadField
              label={t("stamp")}
              currentFileId={company.stampFileId}
              action={uploadStampAction}
              deleteAction={deleteStampAction}
              disabled={!canWrite}
            />
          </div>
        </CardContent>
      </Card>

      <SettingsForm
        sections={sections}
        values={values}
        action={updateCompanyAction}
        disabled={!canWrite}
      />

      <BankAccountsManager
        initialAccounts={bankAccounts}
        disabled={!canWrite}
      />
    </div>
  );
}
