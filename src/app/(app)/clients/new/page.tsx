import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ChevronRight, UserPlus } from "lucide-react";
import {
  ClientForm,
  type ClientFormValues,
} from "@/components/forms/ClientForm";
import { Button } from "@/components/ui/Button";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings";
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
  const tc = await getTranslations("common");
  const tNav = await getTranslations("nav");
  const defaults = getSettings("defaults");

  const initial: ClientFormValues = {
    ...EMPTY,
    country: defaults.country ?? "SA",
    preferredLanguage: defaults.languageMode ?? "ar",
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <UserPlus size={22} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">
                {tNav("dashboard")}
              </Link>
              <ChevronRight size={12} className="rtl:rotate-180" />
              <Link href="/clients" className="hover:text-foreground transition-colors">
                {t("title")}
              </Link>
              <ChevronRight size={12} className="rtl:rotate-180" />
              <span className="text-foreground font-medium">{t("new")}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {t("new")}
            </h1>
          </div>
        </div>

        <Link href="/clients">
          <Button type="button" variant="secondary" size="sm" className="gap-1.5 font-medium shadow-xs">
            <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
            <span>{tc("back")}</span>
          </Button>
        </Link>
      </div>

      <ClientForm mode="create" initial={initial} />
    </div>
  );
}
