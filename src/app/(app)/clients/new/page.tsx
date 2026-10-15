import { getTranslations } from "next-intl/server";
import { UserPlus } from "lucide-react";
import {
  ClientForm,
  type ClientFormValues,
} from "@/components/forms/ClientForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { smoothLoading } from "@/lib/smooth-loader";

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
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "clients.write");
  const t = await getTranslations("clients");

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <UserPlus size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("new")}</h1>
          </div>
        </div>
      </div>
      <ClientForm mode="create" initial={EMPTY} />
    </div>
  );
}
