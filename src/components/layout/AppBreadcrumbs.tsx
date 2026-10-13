"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import MuiBreadcrumbs from "@mui/material/Breadcrumbs";
import MuiTypography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";

const SECTIONS = new Set([
  "clients",
  "projects",
  "contracts",
  "invoices",
  "templates",
  "settings",
  "users",
  "audit",
  "account",
]);

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tc = useTranslations("common");

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string | null }[] = [
    { label: t("dashboard"), href: "/" },
  ];

  if (segments.length > 0) {
    const section = segments[0];
    const sectionLabel = SECTIONS.has(section) ? t(section) : section;
    crumbs.push({
      label: sectionLabel,
      href: segments.length > 1 ? `/${section}` : null,
    });

    if (segments.length > 1) {
      const last = segments[segments.length - 1];
      const label =
        last === "new" ? tc("create") : last === "edit" ? tc("edit") : tc("preview");
      crumbs.push({ label, href: null });
    }
  }

  return (
    <MuiBreadcrumbs
      aria-label="breadcrumb"
      sx={{ "& .MuiBreadcrumbs-separator": { mx: 0.75 } }}
    >
      {crumbs.map((crumb, index) =>
        crumb.href && index < crumbs.length - 1 ? (
          <MuiLink
            key={`${crumb.href}-${index}`}
            component={Link}
            href={crumb.href}
            underline="hover"
            color="text.secondary"
            variant="body2"
          >
            {crumb.label}
          </MuiLink>
        ) : (
          <MuiTypography
            key={`${crumb.label}-${index}`}
            color="text.primary"
            variant="body2"
          >
            {crumb.label}
          </MuiTypography>
        ),
      )}
    </MuiBreadcrumbs>
  );
}