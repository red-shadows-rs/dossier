import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Building2,
  FileText,
  FolderKanban,
  Pencil,
  Receipt,
  Users,
} from "lucide-react";
import { ClientArchiveButton } from "@/components/forms/ClientArchiveButton";
import { ClientDeleteButton } from "@/components/forms/ClientDeleteButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { canDeleteClient, getClient } from "@/server/services/clients";
import { smoothLoading } from "@/lib/smooth-loader";

function Row({
  label,
  value,
  dir,
}: {
  label: string;
  value: string | null;
  dir?: "ltr" | "rtl";
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 rounded border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/30">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd dir={dir} className="text-sm font-semibold tracking-tight text-foreground break-words">
        {value}
      </dd>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const t = await getTranslations("clients");
  const rawLocale = await getLocale();
  const locale = rawLocale === "en" ? "en" : "ar";
  const { id } = await params;

  let client;
  try {
    client = getClient(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  const canWrite = can(user, "clients.write");
  const canDelete = canDeleteClient(id);
  const clientDisplayName =
    (locale === "ar"
      ? client.nameAr || client.nameEn
      : client.nameEn || client.nameAr) ?? "-";
  const clientDir =
    locale === "ar"
      ? (client.nameAr ? "rtl" : "ltr")
      : (client.nameEn ? "ltr" : "rtl");

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Users size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                <span dir={clientDir}>
                  {clientDisplayName}
                </span>
              </h1>
              {client.archivedAt ? (
                <Badge tone="gray" className="translate-y-0.5">{t("archived")}</Badge>
              ) : (
                <Badge tone="green" className="translate-y-0.5">{t("active")}</Badge>
              )}
            </div>
          </div>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/clients/${client.id}/edit`}>
              <Button type="button" variant="secondary" className="gap-1.5 font-medium shadow-xs">
                <Pencil size={15} aria-hidden="true" />
                <span>{t("edit")}</span>
              </Button>
            </Link>
            <ClientArchiveButton
              clientId={client.id}
              archived={client.archivedAt !== null}
            />
            {canDelete ? (
              <ClientDeleteButton clientId={client.id} />
            ) : null}
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Building2 size={18} className="text-primary" aria-hidden="true" />
            <span>{t("identity")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Row label={t("typeLabel")} value={t(`type.${client.type}`)} />
            <Row label={t("nameAr")} value={client.nameAr} dir="rtl" />
            <Row label={t("nameEn")} value={client.nameEn} dir="ltr" />
            <Row
              label={t("legalNameAr")}
              value={client.legalNameAr}
              dir="rtl"
            />
            <Row
              label={t("legalNameEn")}
              value={client.legalNameEn}
              dir="ltr"
            />
            <Row label={t("email")} value={client.email} dir="ltr" />
            <Row label={t("phone")} value={client.phone} dir="ltr" />
            <Row label={t("country")} value={client.country} dir="ltr" />
            <Row label={t("city")} value={client.city} />
            <Row label={t("taxNumber")} value={client.taxNumber} dir="ltr" />
            <Row label={t("crNumber")} value={client.crNumber} dir="ltr" />
            <Row label={t("repNameAr")} value={client.repNameAr} dir="rtl" />
            <Row label={t("repNameEn")} value={client.repNameEn} dir="ltr" />
            <Row label={t("repTitleAr")} value={client.repTitleAr} dir="rtl" />
            <Row label={t("repTitleEn")} value={client.repTitleEn} dir="ltr" />
            <Row
              label={t("preferredLanguage")}
              value={client.preferredLanguage}
            />
            <Row label={t("addressAr")} value={client.addressAr} dir="rtl" />
            <Row label={t("addressEn")} value={client.addressEn} dir="ltr" />
            <Row label={t("notes")} value={client.notes} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <FolderKanban size={18} className="text-primary" aria-hidden="true" />
            <span>{t("projects")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title={t("noProjects")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <FileText size={18} className="text-primary" aria-hidden="true" />
            <span>{t("contracts")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title={t("noContracts")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Receipt size={18} className="text-primary" aria-hidden="true" />
            <span>{t("invoices")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title={t("noInvoices")} />
        </CardContent>
      </Card>
    </div>
  );
}
