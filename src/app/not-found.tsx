import { getTranslations } from "next-intl/server";
import MuiBox from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import MuiStack from "@mui/material/Stack";
import MuiTypography from "@mui/material/Typography";
import { Logo } from "@/components/layout/Logo";

export default async function NotFound() {
  const t = await getTranslations("errors");
  const tn = await getTranslations("nav");

  return (
    <MuiStack
      component="main"
      sx={{
        minHeight: "100dvh",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        p: 3,
        textAlign: "center",
        bgcolor: "background.default",
      }}
    >
      <Logo />
      <MuiBox
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          py: 0.5,
          borderRadius: "999px",
          bgcolor: "action.selected",
          color: "primary.main",
        }}
      >
        <MuiTypography variant="h6" sx={{ fontWeight: 700 }}>
          404
        </MuiTypography>
      </MuiBox>
      <MuiTypography variant="h6" sx={{ fontWeight: 600 }}>
        {t("NOT_FOUND")}
      </MuiTypography>
      <MuiButton href="/" variant="contained">
        {tn("dashboard")}
      </MuiButton>
    </MuiStack>
  );
}