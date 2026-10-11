import Link from "next/link";
import { Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
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
import type { Locale } from "@/lib/constants";
import { formatInstant } from "@/lib/dates";
import { isLocale } from "@/lib/i18n";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getSettings } from "@/server/services/settings";
import { listUsers } from "@/server/services/users";

export default async function UsersPage() {
  const user = await requireUserPage();
  assertCan(user, "users.manage");
  const t = await getTranslations("users");
  const tc = await getTranslations("common");
  const rawLocale = await getLocale();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : user.locale;
  const timezone = getSettings("defaults").timezone;
  const rows = listUsers();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <Link href="/users/new">
          <Button type="button">
            <Plus size={16} aria-hidden="true" />
            {t("new")}
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title={t("empty")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("name")}</TableHeaderCell>
                  <TableHeaderCell>{t("email")}</TableHeaderCell>
                  <TableHeaderCell>{t("roleLabel")}</TableHeaderCell>
                  <TableHeaderCell>{t("canSignForCompany")}</TableHeaderCell>
                  <TableHeaderCell>{tc("status")}</TableHeaderCell>
                  <TableHeaderCell>{t("lastLogin")}</TableHeaderCell>
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
                        href={`/users/${row.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {row.email}
                    </TableCell>
                    <TableCell>{t(`role.${row.role}`)}</TableCell>
                    <TableCell>
                      {row.canSignForCompany ? (
                        <Badge tone="teal">{t("yes")}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.status === "active" ? (
                        <Badge tone="green">{t("active")}</Badge>
                      ) : (
                        <Badge tone="gray">{t("disabled")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.lastLoginAt
                        ? formatInstant(row.lastLoginAt, timezone, locale)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/users/${row.id}`}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          {tc("preview")}
                        </Link>
                      </div>
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
