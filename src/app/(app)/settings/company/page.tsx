// Dossier - Settings Company Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return {
    title: t("company"),
  };
}
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
    { kind: "text", name: "nameAr", label: t("fields.nameAr"), dir: "rtl", placeholder: t("placeholders.nameAr") },
    { kind: "text", name: "nameEn", label: t("fields.nameEn"), dir: "ltr", placeholder: t("placeholders.nameEn") },
    {
      kind: "text",
      name: "legalNameAr",
      label: t("fields.legalNameAr"),
      dir: "rtl",
      placeholder: t("placeholders.legalNameAr"),
    },
    {
      kind: "text",
      name: "legalNameEn",
      label: t("fields.legalNameEn"),
      dir: "ltr",
      placeholder: t("placeholders.legalNameEn"),
    },
    { kind: "text", name: "crNumber", label: t("fields.crNumber"), dir: "ltr", placeholder: t("placeholders.crNumber") },
    {
      kind: "text",
      name: "taxNumber",
      label: t("fields.taxNumber"),
      dir: "ltr",
      placeholder: t("placeholders.taxNumber"),
    },
    { kind: "text", name: "email", label: t("fields.email"), dir: "ltr", placeholder: t("placeholders.email") },
    { kind: "text", name: "phone", label: t("fields.phone"), dir: "ltr", placeholder: t("placeholders.phone") },
    { kind: "text", name: "website", label: t("fields.website"), dir: "ltr", placeholder: t("placeholders.website") },
    {
      kind: "textarea",
      name: "addressAr",
      label: t("fields.addressAr"),
      dir: "rtl",
      placeholder: t("placeholders.addressAr"),
    },
    {
      kind: "textarea",
      name: "addressEn",
      label: t("fields.addressEn"),
      dir: "ltr",
      placeholder: t("placeholders.addressEn"),
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
