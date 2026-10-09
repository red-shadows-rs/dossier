// Dossier - Footer Layout Component
// https://github.com/red-shadows-rs/dossier

import Image from "next/image";
import { getTranslations } from "next-intl/server";
import MuiBox from "@mui/material/Box";
import MuiTypography from "@mui/material/Typography";

export async function Footer({ bordered = true }: { bordered?: boolean }) {
  const t = await getTranslations("common");
  const year = new Date().getFullYear();

  return (
    <MuiBox
      component="footer"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        px: 2,
        py: 1.5,
        borderTop: bordered ? "1px solid" : "none",
        borderColor: "divider",
      }}
    >
      <MuiTypography variant="caption" color="text.secondary">
        {t("rights", { year })}
      </MuiTypography>
      <MuiBox
        component="a"
        href="https://red-shadows-rs.com/"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          color: "text.secondary",
          textDecoration: "none",
          "&:hover": { color: "text.primary" },
        }}
      >
        <Image
          src="/red-shadows-logo.png"
          alt=""
          width={512}
          height={353}
          className="h-4 w-auto"
        />
        <MuiTypography component="span" variant="caption" dir="ltr">
          RED SHADOWS | RS
        </MuiTypography>
      </MuiBox>
    </MuiBox>
  );
}