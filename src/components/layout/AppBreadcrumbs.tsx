"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
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

const SETTINGS_TABS = new Set([
  "company",
  "defaults",
  "numbering",
  "signing",
  "email",
]);

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const ts = useTranslations("settings");

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string | null }[] = [
    { label: t("dashboard"), href: "/" },
  ];

  if (segments.length > 0) {
    const section = segments[0];
    const sectionLabel = SECTIONS.has(section) ? t(section) : section;
    const sectionHref =
      segments.length > 1
        ? section === "settings"
          ? "/settings/company"
          : `/${section}`
        : null;

    crumbs.push({
      label: sectionLabel,
      href: sectionHref,
    });

    if (segments.length > 1) {
      if (section === "settings") {
        const tab = segments[1];
        const tabLabel = SETTINGS_TABS.has(tab)
          ? ts(tab as "company" | "defaults" | "numbering" | "signing" | "email")
          : tab;
        crumbs.push({ label: tabLabel, href: null });
      } else {
        const last = segments[segments.length - 1];
        const isNew = last === "new" || last === "from-milestone";
        const isEdit = last === "edit";
        const label = isNew
          ? tc("create")
          : isEdit
            ? tc("edit")
            : tc("details");
        crumbs.push({ label, href: null });
      }
    }
  }

  return (
    <MuiBreadcrumbs
      aria-label="breadcrumb"
      separator={
        <ChevronRight
          size={14}
          className="rtl:rotate-180 text-muted-foreground"
          aria-hidden="true"
        />
      }
      sx={{ "& .MuiBreadcrumbs-separator": { mx: 0.5 } }}
    >
      {crumbs.map((crumb, index) =>
        crumb.href && index < crumbs.length - 1 ? (
          <MuiLink
            key={`${crumb.href}-${index}`}
            component={Link}
            href={crumb.href}
            prefetch={false}
            underline="none"
            color="text.secondary"
            variant="body2"
            sx={{ "&:hover": { color: "text.primary" } }}
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