"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, RotateCcw } from "lucide-react";
import MuiBox from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import MuiStack from "@mui/material/Stack";
import MuiTypography from "@mui/material/Typography";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");

  return (
    <MuiStack
      component="main"
      sx={{
        minHeight: "70vh",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        p: 3,
        textAlign: "center",
      }}
    >
      <MuiBox
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          borderRadius: "50%",
          bgcolor: "action.selected",
          color: "error.main",
        }}
      >
        <AlertTriangle size={28} aria-hidden="true" />
      </MuiBox>
      <MuiTypography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
        {t("INTERNAL")}
      </MuiTypography>
      <MuiButton type="button" variant="contained" onClick={reset}>
        <RotateCcw size={18} aria-hidden="true" />
        {tc("retry")}
      </MuiButton>
    </MuiStack>
  );
}