"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "./cn";

export function Pagination({
  page,
  totalPages,
  basePath,
  query = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string>;
}) {
  const t = useTranslations("common");
  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(page, 1), totalPages);

  function href(target: number): string {
    const params = new URLSearchParams(query);
    params.set("page", String(target));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav
      aria-label={t("pagination")}
      className="flex items-center justify-between gap-3 pt-2"
    >
      {safePage > 1 ? (
        <Link
          href={href(safePage - 1)}
          className="rounded-md border border-border px-3 py-1 text-sm text-foreground hover:bg-surface"
        >
          {t("previous")}
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(
            "rounded-md border border-border px-3 py-1 text-sm text-muted-foreground opacity-50",
          )}
        >
          {t("previous")}
        </span>
      )}

      <span className="text-sm text-muted-foreground tabular-nums" dir="ltr">
        {safePage} / {totalPages}
      </span>

      {safePage < totalPages ? (
        <Link
          href={href(safePage + 1)}
          className="rounded-md border border-border px-3 py-1 text-sm text-foreground hover:bg-surface"
        >
          {t("next")}
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground opacity-50"
        >
          {t("next")}
        </span>
      )}
    </nav>
  );
}
