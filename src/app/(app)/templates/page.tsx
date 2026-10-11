import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listTemplates } from "@/server/services/templates";

export default async function TemplatesPage() {
  const user = await requireUserPage();
  const t = await getTranslations("templates");
  const tc = await getTranslations("common");
  const { rows } = listTemplates();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        {can(user, "templates.write") ? (
          <Link href="/templates/new">
            <Button type="button">
            <Plus size={16} aria-hidden="true" />
            {t("new")}
          </Button>
          </Link>
        ) : null}
      </div>

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title={t("empty")} description={t("emptyHint")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("name")}</TableHeaderCell>
                  <TableHeaderCell>{t("typeLabel")}</TableHeaderCell>
                  <TableHeaderCell>{t("languageMode")}</TableHeaderCell>
                  <TableHeaderCell>{t("clauses")}</TableHeaderCell>
                  <TableHeaderCell>{t("source")}</TableHeaderCell>
                  <TableHeaderCell className="text-end">
                    {tc("actions")}
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/templates/${row.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        <span dir="rtl" lang="ar">
                          {row.nameAr}
                        </span>
                        {" / "}
                        <span dir="ltr" lang="en">
                          {row.nameEn}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>{t(`type.${row.type}`)}</TableCell>
                    <TableCell>
                      {t(`languageModes.${row.defaultLanguageMode}`)}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start tabular-nums">
                      {row.clauseCount}
                    </TableCell>
                    <TableCell>
                      {row.isSystem ? (
                        <Badge tone="blue">{t("system")}</Badge>
                      ) : (
                        <Badge tone="gray">{t("custom")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <Link
                        href={`/templates/${row.id}`}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        {tc("preview")}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
