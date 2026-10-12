"use client";

import { createTheme } from "@mui/material/styles";

export type AppDirection = "ltr" | "rtl";

export function createAppTheme(direction: AppDirection) {
  return createTheme({
    direction,
    cssVariables: {
      colorSchemeSelector: "class",
    },
    colorSchemes: {
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
    },
    shape: { borderRadius: 4 },
    typography: {
      fontFamily: "var(--font-cairo), 'Cairo', system-ui, sans-serif",
      button: { textTransform: "none", fontWeight: 500 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { gap: 8 } },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiCard: {
        defaultProps: { variant: "outlined" },
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