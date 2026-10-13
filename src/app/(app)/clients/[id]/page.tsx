import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClientArchiveButton } from "@/components/forms/ClientArchiveButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getClient } from "@/server/services/clients";

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
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd dir={dir} className="text-sm text-foreground">
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
  const user = await requireUserPage();
  const t = await getTranslations("clients");
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            <span dir="rtl" lang="ar">
              {client.nameAr ?? client.nameEn ?? "-"}
            </span>
          </h1>
          {client.archivedAt ? (
            <Badge tone="gray">{t("archived")}</Badge>
          ) : (
            <Badge tone="green">{t("active")}</Badge>
          )}
        </div>
        {canWrite ? (
          <div className="flex gap-2">
            <Link href={`/clients/${client.id}/edit`}>
              <Button type="button" variant="secondary">
                {t("edit")}
              </Button>
            </Link>
            <ClientArchiveButton
              clientId={client.id}
              archived={client.archivedAt !== null}
            />
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("identity")}</CardTitle>
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
          <CardTitle>{t("projects")}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title={t("noProjects")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("contracts")}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title={t("noContracts")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("invoices")}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title={t("noInvoices")} />
        </CardContent>
      </Card>
    </div>
  );
}
