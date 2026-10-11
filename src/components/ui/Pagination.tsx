"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import MuiBox from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import MuiTypography from "@mui/material/Typography";

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
    <MuiBox
      component="nav"
      aria-label={t("pagination")}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        pt: 1,
      }}
    >
      {safePage > 1 ? (
        <MuiButton
          component={Link}
          href={href(safePage - 1)}
          variant="outlined"
          color="inherit"
          size="small"
        >
          {t("previous")}
        </MuiButton>
      ) : (
        <MuiButton variant="outlined" color="inherit" size="small" disabled>
          {t("previous")}
        </MuiButton>
      )}

      <MuiTypography
        variant="body2"
        color="text.secondary"
        dir="ltr"
        sx={{ fontVariantNumeric: "tabular-nums" }}
      >
        {safePage} / {totalPages}
      </MuiTypography>

      {safePage < totalPages ? (
        <MuiButton
          component={Link}
          href={href(safePage + 1)}
          variant="outlined"
          color="inherit"
          size="small"
        >
          {t("next")}
        </MuiButton>
      ) : (
        <MuiButton variant="outlined" color="inherit" size="small" disabled>
          {t("next")}
        </MuiButton>
      )}
    </MuiBox>
  );
}