import {
  forwardRef,
  type ComponentType,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import MuiSelectBase from "@mui/material/Select";

type LooseSelectProps = Record<string, unknown> & { children?: ReactNode };

const MuiSelect = MuiSelectBase as unknown as ComponentType<LooseSelectProps>;

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select(
  { className, children, value, onChange, defaultValue, id, disabled, ...props },
  ref,
) {
  return (
    <MuiSelect
      native
      variant="outlined"
      size="small"
      fullWidth
      className={className}
      id={id}
      disabled={disabled}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      inputProps={{ ...(props as object), ref }}
    >
      {children}
    </MuiSelect>
  );
});