import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProjectActions } from "@/components/forms/ProjectActions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/components/ui/cn";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getProjectWithClient } from "@/server/services/projects";

type SearchParams = Record<string, string | string[] | undefined>;

const TABS = ["overview", "contracts", "invoices"] as const;
type Tab = (typeof TABS)[number];

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUserPage();
  const t = await getTranslations("projects");
  const { id } = await params;
  const sp = await searchParams;
  const tabParam = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as Tab)
    : "overview";

  let data;
  try {
    data = getProjectWithClient(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { project, client } = data;
  const canWrite = can(user, "projects.write");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            <span dir="rtl" lang="ar">
              {project.nameAr ?? project.nameEn ?? "—"}
            </span>
          </h1>
          <Badge tone="gray" className="font-mono">
            {project.code}
          </Badge>
          {project.archivedAt ? (
            <Badge tone="gray">{t("archived")}</Badge>
          ) : (
            <Badge tone="blue">{t(`status.${project.status}`)}</Badge>
          )}
        </div>
        {canWrite ? (
          <div className="flex items-center gap-2">
            <Link href={`/projects/${project.id}/edit`}>
              <Button type="button" variant="secondary">
                {t("edit")}
              </Button>
            </Link>
            <ProjectActions
              projectId={project.id}
              status={project.status}
              archived={project.archivedAt !== null}
            />
          </div>
        ) : null}
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((value) => (
          <Link
            key={value}
            href={`/projects/${project.id}?tab=${value}`}
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

      {tab === "overview" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabs.overview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    {t("client")}
                  </dt>
                  <dd className="text-sm text-foreground">
                    <Link
                      href={`/clients/${client.id}`}
                      className="hover:text-primary"
                    >
                      {client.nameAr ?? client.nameEn ?? client.id}
                    </Link>
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    {t("currency")}
                  </dt>
                  <dd dir="ltr" className="text-sm text-foreground">
                    {project.currency}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    {t("statusLabel")}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {t(`status.${project.status}`)}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    {t("startDate")}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {project.startDate ?? "—"}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    {t("endDate")}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {project.endDate ?? "—"}
                  </dd>
                </div>
                {project.description ? (
                  <div className="flex flex-col gap-0.5 sm:col-span-2 lg:col-span-3">
                    <dt className="text-xs text-muted-foreground">
                      {t("description")}
                    </dt>
                    <dd className="whitespace-pre-wrap text-sm text-foreground">
                      {project.description}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("summary.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState title={t("summary.placeholder")} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "contracts" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("tabs.contracts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState title={t("noContracts")} />
          </CardContent>
        </Card>
      ) : null}

      {tab === "invoices" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("tabs.invoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState title={t("noInvoices")} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
