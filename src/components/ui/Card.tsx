import type { ReactNode } from "react";
import MuiBox from "@mui/material/Box";
import MuiCard from "@mui/material/Card";
import MuiCardContent from "@mui/material/CardContent";
import MuiTypography from "@mui/material/Typography";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <MuiCard component="section" className={className}>
      {children}
    </MuiCard>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <MuiBox
      component="header"
      className={className}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      {children}
    </MuiBox>
  );
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <MuiTypography
      component="h2"
      variant="subtitle1"
      className={className}
      sx={{ fontWeight: 600 }}
    >
      {children}
    </MuiTypography>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <MuiCardContent className={className} sx={{ p: 2, "&:last-child": { pb: 2 } }}>
      {children}
    </MuiCardContent>
  );
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <MuiBox
      component="footer"
      className={className}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 1,
        px: 2,
        py: 1.5,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      {children}
    </MuiBox>
  );
}