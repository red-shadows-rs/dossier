import { getTranslations } from "next-intl/server";
import {
  ClientForm,
  type ClientFormValues,
} from "@/components/forms/ClientForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getClient } from "@/server/services/clients";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{t("edit")}</h1>
      <ClientForm mode="edit" clientId={id} initial={initial} />
    </div>
  );
}
