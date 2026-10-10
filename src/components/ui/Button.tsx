import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "radix-ui";
import { cn } from "./cn";

export type ButtonVariant =
  | "primary"
  | "default"
  | "secondary"
  | "outline"
  | "danger"
  | "destructive"
  | "ghost"
  | "link";

export type ButtonSize =
  | "md"
  | "default"
  | "sm"
  | "xs"
  | "lg"
  | "icon"
  | "icon-sm"
  | "icon-xs";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 focus-visible:ring-primary",
  default:
    "bg-primary text-primary-foreground hover:opacity-90 focus-visible:ring-primary",
  secondary:
    "border border-border bg-surface text-foreground hover:border-muted-foreground focus-visible:ring-primary",
  outline:
    "border border-border bg-surface text-foreground hover:border-muted-foreground focus-visible:ring-primary",
  danger:
    "bg-destructive text-destructive-foreground hover:opacity-90 focus-visible:ring-destructive",
  destructive:
    "bg-destructive text-destructive-foreground hover:opacity-90 focus-visible:ring-destructive",
  ghost:
    "text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:ring-primary",
  link: "text-primary underline-offset-4 hover:underline focus-visible:ring-primary",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-sm",
  default: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-sm",
  xs: "h-7 px-2 text-xs",
  lg: "h-11 px-5 text-sm",
  icon: "h-10 w-10",
  "icon-sm": "h-8 w-8",
  "icon-xs": "h-7 w-7",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      asChild,
      ...props
    },
    ref,
  ) {
    const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);

    if (asChild) {
      const forced = disabled || loading ? true : undefined;
      return (
        <Slot.Root
          ref={ref}
          data-slot="button"
          aria-busy={loading ? "true" : undefined}
          {...(forced ? { disabled: forced } : {})}
          className={classes}
          {...props}
        />
      );
    }

    return (
      <button
        ref={ref}
        data-slot="button"
        disabled={disabled || loading}
        aria-busy={loading ? "true" : undefined}
        className={classes}
        {...props}
      />
    );
  },
);