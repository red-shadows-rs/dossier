import { getTranslations } from "next-intl/server";
import {
  ClientForm,
  type ClientFormValues,
} from "@/components/forms/ClientForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";

const EMPTY: ClientFormValues = {
  type: "company",
  nameAr: "",
  nameEn: "",
  legalNameAr: "",
  legalNameEn: "",
  email: "",
  phone: "",
  country: "",
  city: "",
  addressAr: "",
  addressEn: "",
  taxNumber: "",
  crNumber: "",
  repNameAr: "",
  repNameEn: "",
  repTitleAr: "",
  repTitleEn: "",
  preferredLanguage: "ar",
  notes: "",
};

export default async function NewClientPage() {
  const user = await requireUserPage();
  assertCan(user, "clients.write");
  const t = await getTranslations("clients");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{t("new")}</h1>
      <ClientForm mode="create" initial={EMPTY} />
    </div>
  );
}
