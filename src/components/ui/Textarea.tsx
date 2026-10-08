// Dossier - Textarea Ui Component
// https://github.com/red-shadows-rs/dossier

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  fullWidth?: boolean;
  size?: unknown;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { className, rows = 4, disabled, fullWidth: _fw, size: _sz, ...props },
    ref,
  ) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={cn(
          "flex min-h-[80px] w-full rounded border border-border/80 bg-background/50 px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);