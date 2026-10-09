import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { getLocale, getTranslations } from "next-intl/server";
import { ContractDraftActions } from "@/components/forms/ContractDraftActions";
import { Badge, contractStatusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AppError } from "@/lib/errors";
import { isLocale } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getContractDetail } from "@/server/services/contracts";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  const t = await getTranslations("contracts");
  const { id } = await params;

  let detail;
  try {
    detail = getContractDetail(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { contract, items, milestones, clauses } = detail;
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, contract.projectId))
    .get();
  const client = project
    ? db.select().from(clients).where(eq(clients.id, project.clientId)).get()
    : undefined;
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : "ar";
  const canWrite = can(user, "contracts.write");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            <span dir="rtl" lang="ar">
              {contract.titleAr ?? contract.titleEn ?? "—"}
            </span>
          </h1>
          <Badge tone={contractStatusTone(contract.status)}>
            {t(`status.${contract.status}`)}
          </Badge>
          {contract.number ? (
            <span className="font-mono text-sm text-muted-foreground" dir="ltr">
              {contract.number}
            </span>
          ) : null}
        </div>
        {contract.status === "draft" && canWrite ? (
          <div className="flex items-center gap-2">
            <Link href={`/contracts/${contract.id}/edit`}>
              <Button type="button">{t("openBuilder")}</Button>
            </Link>
            <ContractDraftActions
              contractId={contract.id}
              canDelete={contract.number === null}
            />
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("summary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Row
              label={t("project")}
              value={project?.nameAr ?? project?.nameEn ?? "—"}
            />
            <Row
              label={t("client")}
              value={client?.nameAr ?? client?.nameEn ?? "—"}
            />
            <Row
              label={t("languageMode")}
              value={t(`languageModes.${contract.languageMode}`)}
            />
            <Row label={t("currency")} value={contract.currency} ltr />
            <Row
              label={t("hasFees")}
              value={contract.hasFees ? t("yes") : t("no")}
            />
            <Row label={t("items")} value={String(items.length)} ltr />
            <Row
              label={t("milestones")}
              value={String(milestones.length)}
              ltr
            />
            <Row label={t("clauses")} value={String(clauses.length)} ltr />
            <Row label={t("startDate")} value={contract.startDate ?? "—"} ltr />
            <Row label={t("endDate")} value={contract.endDate ?? "—"} ltr />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("document")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("documentPlaceholder", { lang: locale })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}
