"use client";

import { createTheme } from "@mui/material/styles";

export type AppDirection = "ltr" | "rtl";

export function createAppTheme(
  direction: AppDirection,
  defaultColorScheme: "dark" | "light" = "dark",
) {
  return createTheme({
    direction,
    defaultColorScheme,
    cssVariables: {
      colorSchemeSelector: "class",
    },
    colorSchemes: {
      dark: {
        palette: {
          primary: { main: "#e11d48" },
          background: { default: "#0b0b0f", paper: "#14141a" },
          text: { primary: "#ededf0", secondary: "#9a9aa6" },
          divider: "#26262e",
          success: { main: "#22c55e" },
          warning: { main: "#f59e0b" },
          error: { main: "#ef4444" },
          info: { main: "#3b82f6" },
        },
      },
      light: {
        palette: {
          primary: { main: "#e11d48" },
          background: { default: "#ffffff", paper: "#f6f6f8" },
          text: { primary: "#16161a", secondary: "#6b6b76" },
          divider: "#e4e4e9",
          success: { main: "#22c55e" },
          warning: { main: "#f59e0b" },
          error: { main: "#ef4444" },
          info: { main: "#3b82f6" },
        },
      },
    },
    shape: { borderRadius: 4 },
    typography: {
      fontFamily: "var(--font-cairo), 'Cairo', system-ui, sans-serif",
      button: { textTransform: "none", fontWeight: 500 },
    },
    components: {
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: "rgba(128, 128, 128, 0.05)",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            fontSize: "0.75rem",
            color: "var(--muted-foreground)",
            borderColor: "var(--border)",
          },
          root: {
            borderColor: "var(--border)",
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            gap: 8,
            cursor: "pointer",
            "&.Mui-disabled": { cursor: "not-allowed" },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            cursor: "pointer",
            "&.Mui-disabled": { cursor: "not-allowed" },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            cursor: "pointer",
            "& .MuiSelect-select": { cursor: "pointer" },
            "& .MuiSelect-icon": { cursor: "pointer" },
            "&.Mui-disabled": { cursor: "not-allowed" },
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            cursor: "pointer",
            "&.Mui-disabled": { cursor: "not-allowed" },
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            cursor: "pointer",
            "& input": { cursor: "pointer" },
            "&.Mui-disabled": { cursor: "not-allowed" },
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiCard: {
        defaultProps: { elevation: 1 },
        styleOverrides: {
          root: {
            overflow: "visible",
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: "inherit" },
      },
      MuiTooltip: {
        defaultProps: { arrow: false },
      },
    },
  });
}