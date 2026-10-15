import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export type FieldProps = {
  label: ReactNode;
  htmlFor?: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  requiredMark?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  requiredMark,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center text-xs font-semibold tracking-tight text-foreground/90 select-none"
      >
        <span>{label}</span>
        {required ? (
          requiredMark ?? (
            <span
              aria-hidden="true"
              className="ms-1 align-super text-xs text-primary font-bold"
            >
              *
            </span>
          )
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <span className="text-[11px] text-muted-foreground ps-0.5 leading-normal">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          role="alert"
          className="text-[11px] font-medium text-destructive ps-0.5 leading-normal"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}