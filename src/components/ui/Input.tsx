// Dossier - Input Ui Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { DatePicker } from "@/components/ui/DatePicker";
import { NumberInput } from "@/components/ui/NumberInput";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: "small" | "medium" | number;
  fullWidth?: boolean;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  inputClassName?: string;
  clearable?: boolean;
  hideSteppers?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    inputClassName,
    startAdornment,
    endAdornment,
    disabled,
    fullWidth: _fw,
    size: _sz,
    hideSteppers,
    ...props
  },
  ref,
) {
  if (props.type === "date") {
    const { type: _dateType, ...dateProps } = props;
    return (
      <DatePicker
        ref={ref}
        disabled={disabled}
        className={className}
        inputClassName={inputClassName}
        {...dateProps}
      />
    );
  }

  if (props.type === "number") {
    const { type: _numberType, ...numberProps } = props;
    return (
      <NumberInput
        ref={ref}
        disabled={disabled}
        className={className}
        inputClassName={inputClassName}
        startAdornment={startAdornment}
        endAdornment={endAdornment}
        hideSteppers={hideSteppers}
        {...numberProps}
      />
    );
  }
  const numericSize = typeof _sz === "number" ? _sz : undefined;

  if (startAdornment || endAdornment) {
    return (
      <div
        className={cn(
          "flex h-10 w-full items-center rounded border border-border/80 bg-background/50 px-3 text-sm shadow-xs transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
          disabled && "cursor-not-allowed opacity-50 bg-muted/20",
          className,
        )}
      >
        {startAdornment}
        <input
          ref={ref}
          disabled={disabled}
          size={numericSize}
          className={cn(
            "h-full w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed",
            inputClassName,
          )}
          {...props}
        />
        {endAdornment}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      disabled={disabled}
      size={numericSize}
      className={cn(
        "flex h-10 w-full rounded border border-border/80 bg-background/50 px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export function InputAdornment({
  position,
  children,
  className,
}: {
  position?: "start" | "end";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-muted-foreground shrink-0 select-none",
        position === "start" ? "me-2.5" : "ms-2.5",
        className,
      )}
    >
      {children}
    </span>
  );
}