import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
} from "react";
import MuiButton from "@mui/material/Button";
import MuiIconButton from "@mui/material/IconButton";

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

type NativeProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color">;

export type ButtonProps = NativeProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
};

const ICON_SIZES: Record<"icon" | "icon-sm" | "icon-xs", "small" | "medium"> = {
  icon: "medium",
  "icon-sm": "small",
  "icon-xs": "small",
};

const TEXT_SIZES: Record<string, "small" | "medium" | "large"> = {
  xs: "small",
  sm: "small",
  md: "medium",
  default: "medium",
  lg: "large",
};

function toMuiVariant(variant: ButtonVariant): {
  variant: "contained" | "outlined" | "text";
  color: "primary" | "error" | "inherit";
} {
  switch (variant) {
    case "secondary":
    case "outline":
      return { variant: "outlined", color: "inherit" };
    case "danger":
    case "destructive":
      return { variant: "contained", color: "error" };
    case "ghost":
      return { variant: "text", color: "inherit" };
    case "link":
      return { variant: "text", color: "primary" };
    default:
      return { variant: "contained", color: "primary" };
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading,
      disabled,
      asChild,
      className,
      children,
      type,
      ...props
    },
    ref,
  ) {
    const busy = loading ? true : undefined;

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string }>;
      return cloneElement(child, {
        className: [className, child.props.className]
          .filter(Boolean)
          .join(" "),
      });
    }

    if (size === "icon" || size === "icon-sm" || size === "icon-xs") {
      return (
        <MuiIconButton
          ref={ref}
          data-slot="button"
          type={type ?? "button"}
          size={ICON_SIZES[size]}
          disabled={disabled || loading}
          aria-busy={busy}
          className={className}
          {...props}
        >
          {children}
        </MuiIconButton>
      );
    }

    const { variant: muiVariant, color } = toMuiVariant(variant);

    return (
      <MuiButton
        ref={ref}
        data-slot="button"
        type={type ?? "button"}
        variant={muiVariant}
        color={color}
        size={TEXT_SIZES[size] ?? "medium"}
        loading={loading}
        disabled={disabled}
        aria-busy={busy}
        className={className}
        {...props}
      >
        {children}
      </MuiButton>
    );
  },
);