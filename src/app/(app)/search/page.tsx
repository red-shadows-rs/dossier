import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireUserPage } from "@/server/auth/require-user";
import { searchAll } from "@/server/services/search";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUserPage();
  const locale = await getLocale();
  const t = await getTranslations("search");
  const tn = await getTranslations("nav");
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const q = raw?.trim() ?? "";

  const results = searchAll(user, q, locale === "ar" ? "ar" : "en");
  const groups = [
    { key: "clients", label: tn("clients"), hits: results.clients },
    { key: "projects", label: tn("projects"), hits: results.projects },
    { key: "contracts", label: tn("contracts"), hits: results.contracts },
    { key: "invoices", label: tn("invoices"), hits: results.invoices },
  ];
  const visible = groups.filter((group) => group.hits.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">
        {q ? t("forQuery", { q }) : t("prompt")}
      </p>

      {q && visible.length === 0 ? (
        <EmptyState title={t("noResults")} description={t("noResultsHint")} />
      ) : null}

      {visible.map((group) => (
        <Card key={group.key}>
          <CardHeader>
            <CardTitle>{group.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {group.hits.map((hit) => (
              <Link
                key={hit.id}
                href={hit.href}
                className="flex flex-col gap-0.5 py-2 transition-colors hover:text-primary"
              >
                <span className="truncate text-sm font-medium text-foreground">
                  {hit.primary}
                </span>
                {hit.secondary ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {hit.secondary}
                  </span>
                ) : null}
              </Link>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}