import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { getLocale, getTranslations } from "next-intl/server";
import { ContractDocumentViewer } from "@/components/forms/ContractDocumentViewer";
import { ContractDraftActions } from "@/components/forms/ContractDraftActions";
import { Badge, contractStatusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { cn } from "@/components/ui/cn";
import { formatInstant } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isLocale } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listAuditEntries } from "@/server/services/audit";
import {
  getContractDetail,
  listContractVersions,
} from "@/server/services/contracts";

type SearchParams = Record<string, string | string[] | undefined>;

const TABS = ["summary", "document", "signatures", "history"] as const;
type Tab = (typeof TABS)[number];

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUserPage();
  const t = await getTranslations("contracts");
  const tc = await getTranslations("common");
  const { id } = await params;
  const sp = await searchParams;
  const tabParam = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as Tab)
    : "summary";

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
  const currency = contract.currency as CurrencyCode;

  const versions = listContractVersions(id);
  const history = listAuditEntries({
    entityType: "contract",
    entityId: id,
    page: 1,
  });

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

      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((value) => (
          <Link
            key={value}
            href={`/contracts/${contract.id}?tab=${value}`}
            aria-current={tab === value ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
              tab === value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`tabs.${value}`)}
          </Link>
        ))}
      </nav>

      {tab === "summary" ? (
        <div className="flex flex-col gap-4">
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
                <Row
                  label={t("startDate")}
                  value={contract.startDate ?? "—"}
                  ltr
                />
                <Row label={t("endDate")} value={contract.endDate ?? "—"} ltr />
              </dl>
            </CardContent>
          </Card>

          {contract.hasFees ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("totalsTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-1" dir="ltr">
                  <Money
                    label={tc("subtotal")}
                    value={formatMoney(contract.subtotalMinor, currency, "en")}
                  />
                  <Money
                    label={t("discountLabel")}
                    value={formatMoney(contract.discountMinor, currency, "en")}
                  />
                  <Money
                    label={t("net")}
                    value={formatMoney(contract.netMinor, currency, "en")}
                  />
                  <Money
                    label={t("tax")}
                    value={formatMoney(contract.taxMinor, currency, "en")}
                  />
                  <Money
                    label={tc("total")}
                    value={formatMoney(contract.totalMinor, currency, "en")}
                    strong
                  />
                </dl>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "document" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("document")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ContractDocumentViewer
              id={contract.id}
              languageMode={contract.languageMode}
              canDownload={can(user, "contracts.read")}
            />
          </CardContent>
        </Card>
      ) : null}

      {tab === "signatures" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("tabs.signatures")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState title={t("signaturesPlaceholder")} />
          </CardContent>
        </Card>
      ) : null}

      {tab === "history" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("history.versions")}</CardTitle>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <EmptyState title={t("history.noVersions")} />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>{t("history.version")}</TableHeaderCell>
                      <TableHeaderCell>{t("history.hash")}</TableHeaderCell>
                      <TableHeaderCell>
                        {t("history.createdAt")}
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {versions.map((version) => (
                      <TableRow key={version.id}>
                        <TableCell dir="ltr">{version.versionNo}</TableCell>
                        <TableCell dir="ltr" className="font-mono text-xs">
                          {version.contentHash.slice(0, 16)}…
                        </TableCell>
                        <TableCell>
                          {formatInstant(version.createdAt, "UTC", locale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("history.activity")}</CardTitle>
            </CardHeader>
            <CardContent>
              {history.rows.length === 0 ? (
                <EmptyState title={t("history.noActivity")} />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>{t("history.when")}</TableHeaderCell>
                      <TableHeaderCell>{t("history.action")}</TableHeaderCell>
                      <TableHeaderCell>{t("history.actor")}</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatInstant(row.ts, "UTC", locale)}
                        </TableCell>
                        <TableCell dir="ltr">{row.action}</TableCell>
                        <TableCell>
                          {row.actorType}
                          {row.actorId ? (
                            <span
                              className="ms-1 text-xs text-muted-foreground"
                              dir="ltr"
                            >
                              {row.actorId}
                            </span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
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

function Money({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          strong ? "font-semibold text-foreground tabular-nums" : "tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}
