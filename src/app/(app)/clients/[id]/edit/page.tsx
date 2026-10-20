// Dossier - Clients Id Edit Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  ClientForm,
  type ClientFormValues,
} from "@/components/forms/ClientForm";
import { Button } from "@/components/ui/Button";
import { withDbInstance } from "@/db";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";
import { getClient } from "@/server/services/clients";
import { smoothLoading } from "@/lib/smooth-loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const client = getClient(id);
    const t = await getTranslations("clients");
    return {
      title: `${t("edit")} · ${client.nameAr || client.nameEn || id}`,
    };
  } catch {
    return { title: "Dossier" };
  }
}

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "clients.write");
  const isDemo = isDemoUser(user.email);
  const t = await getTranslations("clients");
  const tc = await getTranslations("common");
  const { id } = await params;

  return withDbInstance(isDemo, async () => {
    let client;
    try {
      client = getClient(id);
    } catch (error) {
      if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
      throw error;
    }

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href="/clients"
            className="hover:text-foreground transition-colors"
          >
            {t("title")}
          </Link>
          <span className="text-border">/</span>
          <Link
            href={`/clients/${id}`}
            className="hover:text-foreground transition-colors truncate max-w-[200px]"
          >
            {clientName}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium">{t("edit")}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <Pencil size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
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
      </div>

      <ClientForm mode="edit" clientId={id} initial={initial} />
    </div>
    );
  });
}
