import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import MuiBox from "@mui/material/Box";
import MuiStack from "@mui/material/Stack";
import MuiTypography from "@mui/material/Typography";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  bordered = true,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  const isBorderless = !bordered || className?.includes("border-0");
  return (
    <MuiStack
      spacing={1.5}
      className={className}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        border: isBorderless ? "none" : "1px dashed",
        borderColor: isBorderless ? "transparent" : "divider",
        borderRadius: "var(--mui-shape-borderRadius)",
        px: 3,
        py: 6,
        textAlign: "center",
      }}
    >
      <MuiBox sx={{ color: "text.secondary" }} aria-hidden="true">
        {icon ?? <Inbox size={36} strokeWidth={1.5} />}
      </MuiBox>
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