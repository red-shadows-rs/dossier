import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  Building2,
  Calendar,
  Coins,
  FileEdit,
  FileSignature,
  FileText,
  FolderKanban,
  Globe,
  History,
  Layers,
  Receipt,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { getLocale, getTranslations } from "next-intl/server";
import { ContractDocumentViewer } from "@/components/forms/ContractDocumentViewer";
import { ContractDraftActions } from "@/components/forms/ContractDraftActions";
import { ContractLifecycleActions } from "@/components/forms/ContractLifecycleActions";
import { FinalizeRetryBanner } from "@/components/forms/FinalizeRetryBanner";
import { Badge, contractStatusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { smoothLoading } from "@/lib/smooth-loader";
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
import { listContractSignatories } from "@/server/services/contracts-lifecycle";

type SearchParams = Record<string, string | string[] | undefined>;

const TABS = ["summary", "document", "signatures", "history"] as const;
type Tab = (typeof TABS)[number];

const TAB_ICONS = {
  summary: ScrollText,
  document: FileText,
  signatures: FileSignature,
  history: History,
} as const;

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await smoothLoading();
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
  const signatories = listContractSignatories(id);
  const history = listAuditEntries({
    entityType: "contract",
    entityId: id,
    page: 1,
  });

  const contractTitle =
    locale === "ar"
      ? (contract.titleAr || contract.titleEn || "-")
      : (contract.titleEn || contract.titleAr || "-");
  const contractDir =
    locale === "ar"
      ? (contract.titleAr ? "rtl" : "ltr")
      : (contract.titleEn ? "ltr" : "rtl");

  const tabCounts: Record<Tab, number | null> = {
    summary: null,
    document: null,
    signatures: signatories.length,
    history: history.total,
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <FileText size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                <span dir={contractDir}>
                  {contractTitle}
                </span>
              </h1>
              <Badge tone={contractStatusTone(contract.status)} className="translate-y-0.5">
                {t(`status.${contract.status}`)}
              </Badge>
              {contract.number ? (
                <span className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground translate-y-0.5" dir="ltr">
                  {contract.number}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {contract.status === "draft" && canWrite ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/contracts/${contract.id}/edit`}>
              <Button type="button" className="gap-1.5 font-medium shadow-xs">
                <FileEdit size={15} aria-hidden="true" />
                <span>{t("openBuilder")}</span>
              </Button>
            </Link>
            <ContractDraftActions
              contractId={contract.id}
              canDelete={contract.number === null}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <ContractLifecycleActions
              contractId={contract.id}
              status={contract.status}
              canWrite={canWrite}
              canSend={can(user, "contracts.send")}
              canCancel={can(user, "contracts.cancel")}
              canTerminate={can(user, "contracts.terminate")}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded border border-border/80 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{tc("total")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {formatMoney(contract.totalMinor, currency, locale)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded border border-border/80 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("items")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {items.length}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded border border-border/80 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("milestones")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {milestones.length}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded border border-border/80 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("clauses")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {clauses.length}
          </span>
        </div>
      </div>

      {contract.status === "signed" && contract.finalPdfFileId === null ? (
        <FinalizeRetryBanner
          contractId={contract.id}
          attempts={contract.pdfAttempts}
          canRetry={canWrite}
        />
      ) : null}

      <nav className="flex gap-1 overflow-x-auto border-b border-border/60">
        {TABS.map((value) => {
          const Icon = TAB_ICONS[value];
          const count = tabCounts[value];
          return (
            <Link
              key={value}
              href={`/contracts/${contract.id}?tab=${value}`}
              aria-current={tab === value ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{t(`tabs.${value}`)}</span>
              {count !== null && count !== undefined ? (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px] font-mono font-medium",
                    tab === value
                      ? "bg-primary/15 text-primary"
                      : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {tab === "summary" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <ScrollText size={18} className="text-primary" aria-hidden="true" />
                <span>{t("summary")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Row
                  label={t("project")}
                  icon={FolderKanban}
                  value={
                    (locale === "ar"
                      ? project?.nameAr || project?.nameEn
                      : project?.nameEn || project?.nameAr) ?? "-"
                  }
                />
                <Row
                  label={t("client")}
                  icon={Building2}
                  value={
                    (locale === "ar"
                      ? client?.nameAr || client?.nameEn
                      : client?.nameEn || client?.nameAr) ?? "-"
                  }
                />
                <Row
                  label={t("languageMode")}
                  icon={Globe}
                  value={t(`languageModes.${contract.languageMode}`)}
                />
                <Row label={t("currency")} value={contract.currency} ltr icon={Coins} />
                <Row
                  label={t("hasFees")}
                  icon={Receipt}
                  value={contract.hasFees ? t("yes") : t("no")}
                />
                <Row label={t("items")} value={String(items.length)} ltr icon={FileText} />
                <Row
                  label={t("milestones")}
                  value={String(milestones.length)}
                  ltr
                  icon={Layers}
                />
                <Row label={t("clauses")} value={String(clauses.length)} ltr icon={FileSignature} />
                <Row
                  label={t("startDate")}
                  value={contract.startDate ?? "-"}
                  ltr
                  icon={Calendar}
                />
                <Row label={t("endDate")} value={contract.endDate ?? "-"} ltr icon={Calendar} />
              </dl>
            </CardContent>
          </Card>

          {contract.hasFees ? (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <Receipt size={18} className="text-primary" aria-hidden="true" />
                  <span>{t("totalsTitle")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-1">
                  <Money
                    label={tc("subtotal")}
                    value={formatMoney(contract.subtotalMinor, currency, user.locale)}
                  />
                  <Money
                    label={t("discountLabel")}
                    value={formatMoney(contract.discountMinor, currency, user.locale)}
                  />
                  <Money
                    label={t("net")}
                    value={formatMoney(contract.netMinor, currency, user.locale)}
                  />
                  <Money
                    label={t("tax")}
                    value={formatMoney(contract.taxMinor, currency, user.locale)}
                  />
                  <Money
                    label={tc("total")}
                    value={formatMoney(contract.totalMinor, currency, user.locale)}
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
            <CardTitle className="inline-flex items-center gap-2">
              <FileText size={18} className="text-primary" aria-hidden="true" />
              <span>{t("document")}</span>
            </CardTitle>
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
            <CardTitle className="inline-flex items-center gap-2">
              <FileSignature size={18} className="text-primary" aria-hidden="true" />
              <span>{t("tabs.signatures")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signatories.length === 0 ? (
              <EmptyState title={t("signatures.empty")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("signatures.role")}</TableHeaderCell>
                    <TableHeaderCell>{t("signatures.name")}</TableHeaderCell>
                    <TableHeaderCell>{t("signatures.status")}</TableHeaderCell>
                    <TableHeaderCell>{t("signatures.viewedAt")}</TableHeaderCell>
                    <TableHeaderCell>{t("signatures.otpAt")}</TableHeaderCell>
                    <TableHeaderCell>{t("signatures.signedAt")}</TableHeaderCell>
                    <TableHeaderCell>{t("signatures.method")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {signatories.map((sig) => (
                    <TableRow key={sig.id}>
                      <TableCell>{t(`signatures.roles.${sig.role}`)}</TableCell>
                      <TableCell>
                        <span className="block">{sig.name}</span>
                        {sig.title ? (
                          <span className="block text-xs text-muted-foreground">
                            {sig.title}
                          </span>
                        ) : null}
                        {sig.status === "declined" && sig.declineReason ? (
                          <span className="block text-xs text-destructive">
                            {t("signatures.reason")}: {sig.declineReason}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge
                          tone={sig.status === "signed" ? "green" : sig.status === "declined" ? "red" : "gray"}
                        >
                          {t(`signatures.statusLabel.${sig.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {sig.viewedAt
                          ? formatInstant(sig.viewedAt, "UTC", locale)
                          : t("signatures.dash")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {sig.otpVerifiedAt
                          ? formatInstant(sig.otpVerifiedAt, "UTC", locale)
                          : t("signatures.dash")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {sig.signedAt
                          ? formatInstant(sig.signedAt, "UTC", locale)
                          : t("signatures.dash")}
                      </TableCell>
                      <TableCell>
                        {sig.signatureMethod
                          ? t(`signatures.methodLabel.${sig.signatureMethod}`)
                          : t("signatures.dash")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "history" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Layers size={18} className="text-primary" aria-hidden="true" />
                <span>{t("history.versions")}</span>
              </CardTitle>
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
                        <TableCell className="tabular-nums font-mono">{version.versionNo}</TableCell>
                        <TableCell className="font-mono text-xs">
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
              <CardTitle className="inline-flex items-center gap-2">
                <History size={18} className="text-primary" aria-hidden="true" />
                <span>{t("history.activity")}</span>
              </CardTitle>
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
                        <TableCell>
                          <span className="font-mono text-xs">{row.action}</span>
                        </TableCell>
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
  icon: Icon,
}: {
  label: string;
  value: string;
  ltr?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded border border-border/70 bg-card p-3 shadow-2xs transition-colors hover:border-primary/40">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon ? <Icon size={13} className="text-primary/70 shrink-0" aria-hidden /> : null}
        <span>{label}</span>
      </dt>
      <dd className="text-sm font-semibold tracking-tight text-foreground break-words" dir={ltr ? "ltr" : undefined}>
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
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2 border-b border-border/40 text-sm",
        strong && "border-t-2 border-t-primary/30 border-b-0 pt-3 text-base font-bold text-foreground",
      )}
    >
      <dt className={strong ? "font-bold text-foreground" : "text-muted-foreground"}>
        {label}
      </dt>
      <dd
        className={cn(
          "font-mono tabular-nums",
          strong ? "text-lg font-bold text-primary" : "text-foreground font-semibold",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
