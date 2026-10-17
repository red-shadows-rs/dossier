import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ChevronRight, Pencil } from "lucide-react";
import {
  ClientForm,
  type ClientFormValues,
} from "@/components/forms/ClientForm";
import { Button } from "@/components/ui/Button";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getClient } from "@/server/services/clients";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "clients.write");
  const t = await getTranslations("clients");
  const tc = await getTranslations("common");
  const tNav = await getTranslations("nav");
  const { id } = await params;
  const client = getClient(id);

  const initial: ClientFormValues = {
    type: client.type,
    nameAr: client.nameAr ?? "",
    nameEn: client.nameEn ?? "",
    legalNameAr: client.legalNameAr ?? "",
    legalNameEn: client.legalNameEn ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    country: client.country ?? "",
    city: client.city ?? "",
    addressAr: client.addressAr ?? "",
    addressEn: client.addressEn ?? "",
    taxNumber: client.taxNumber ?? "",
    crNumber: client.crNumber ?? "",
    repNameAr: client.repNameAr ?? "",
    repNameEn: client.repNameEn ?? "",
    repTitleAr: client.repTitleAr ?? "",
    repTitleEn: client.repTitleEn ?? "",
    preferredLanguage: client.preferredLanguage,
    notes: client.notes ?? "",
  };

  const clientName = client.nameAr || client.nameEn;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Pencil size={22} aria-hidden="true" />
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
              <Link href={`/clients/${id}`} className="hover:text-foreground transition-colors">
                {clientName}
              </Link>
              <ChevronRight size={12} className="rtl:rotate-180" />
              <span className="text-foreground font-medium">{t("edit")}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("edit")}
              </h1>
              <span className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {clientName}
              </span>
            </div>
          </div>
        </div>

        <Link href={`/clients/${id}`}>
          <Button type="button" variant="secondary" size="sm" className="gap-1.5 font-medium shadow-xs">
            <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
            <span>{tc("back")}</span>
          </Button>
        </Link>
      </div>

      <ClientForm mode="edit" clientId={id} initial={initial} />
    </div>
  );
}
