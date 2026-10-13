"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  type ComponentType,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import MuiMenuItem from "@mui/material/MenuItem";
import MuiSelectBase from "@mui/material/Select";

type LooseSelectProps = Record<string, unknown> & { children?: ReactNode };

const MuiSelect = MuiSelectBase as unknown as ComponentType<LooseSelectProps>;

type OptionItem = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

function toOptionItems(children: ReactNode): OptionItem[] {
  const items: OptionItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type !== "option") return;
    const props = child.props as {
      value?: string | number;
      children?: ReactNode;
      disabled?: boolean;
    };
    items.push({
      value: String(props.value ?? ""),
      label: props.children,
      disabled: props.disabled,
    });
  });
  return items;
}

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select(
  { className, children, value, onChange, defaultValue, id, disabled, ...props },
  ref,
) {
  const items = toOptionItems(children);
  return (
    <MuiSelect
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
      {items.map((item) => (
        <MuiMenuItem
          key={item.value}
          value={item.value}
          disabled={item.disabled}
        >
          {item.label}
        </MuiMenuItem>
      ))}
    </MuiSelect>
  );
});