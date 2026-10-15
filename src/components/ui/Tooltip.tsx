"use client";

import type { ReactElement, ReactNode } from "react";
import MuiTooltip from "@mui/material/Tooltip";

export type TooltipProps = {
  content: ReactNode;
  children: ReactElement;
  side?: "top" | "bottom" | "start" | "end";
  className?: string;
  delayMs?: number;
};

export function Tooltip({
  content,
  children,
  side = "top",
  delayMs = 150,
}: TooltipProps) {
  if (!content) return children;

  const placement =
    side === "top"
      ? "top"
      : side === "bottom"
        ? "bottom"
        : side === "start"
          ? "left"
          : "right";

  return (
    <MuiTooltip
      title={content}
      placement={placement}
      enterDelay={delayMs}
      leaveDelay={50}
      arrow
      slotProps={{
        popper: {
          modifiers: [
            {
              name: "offset",
              options: {
                offset: [0, 6],
              },
            },
          ],
        },
        tooltip: {
          sx: {
            bgcolor: "var(--card, #14141a)",
            color: "var(--foreground, #ededf0)",
            border: "1px solid var(--border, #26262e)",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
            fontSize: "0.75rem",
            fontWeight: 500,
            py: 0.5,
            px: 1.25,
            borderRadius: "6px",
            fontFamily: "var(--font-cairo), system-ui, sans-serif",
          },
        },
        arrow: {
          sx: {
            color: "var(--card, #14141a)",
            "&::before": {
              border: "1px solid var(--border, #26262e)",
            },
          },
        },
      }}
    >
      <span className="inline-flex items-center">{children}</span>
    </MuiTooltip>
  );
}
