import type { ReactNode } from "react";
import MuiBox from "@mui/material/Box";
import MuiStack from "@mui/material/Stack";
import MuiTypography from "@mui/material/Typography";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <MuiStack
      spacing={1.5}
      className={className}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: "var(--mui-shape-borderRadius)",
        px: 3,
        py: 6,
        textAlign: "center",
      }}
    >
      {icon ? (
        <MuiBox sx={{ color: "text.secondary" }} aria-hidden="true">
          {icon}
        </MuiBox>
      ) : null}
      <MuiTypography variant="body1" sx={{ fontWeight: 500 }}>
        {title}
      </MuiTypography>
      {description ? (
        <MuiTypography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: "28rem" }}
        >
          {description}
        </MuiTypography>
      ) : null}
      {action}
    </MuiStack>
  );
}