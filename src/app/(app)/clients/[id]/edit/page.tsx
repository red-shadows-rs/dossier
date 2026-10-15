import { getTranslations } from "next-intl/server";
import { Pencil } from "lucide-react";
import {
  ClientForm,
  type ClientFormValues,
} from "@/components/forms/ClientForm";
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

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Pencil size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("edit")}</h1>
            <p className="text-xs text-muted-foreground">
              {client.nameAr ?? client.nameEn}
            </p>
          </div>
        </div>
      </div>
      <ClientForm mode="edit" clientId={id} initial={initial} />
    </div>
  );
}
