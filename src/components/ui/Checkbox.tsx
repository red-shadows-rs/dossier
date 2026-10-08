// Dossier - Checkbox Ui Component
// https://github.com/red-shadows-rs/dossier

"use client";

import type { ChangeEventHandler, ReactNode } from "react";
import MuiCheckbox from "@mui/material/Checkbox";
import type { SxProps, Theme } from "@mui/material/styles";

export function Checkbox({
  id,
  name,
  value,
  label,
  defaultChecked,
  checked,
  onChange,
  disabled,
  className,
  sx,
}: {
  id?: string;
  name?: string;
  value?: string;
  label?: ReactNode;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  className?: string;
  sx?: SxProps<Theme>;
}) {
  const checkbox = (
    <MuiCheckbox
      id={id}
      name={name}
      value={value}
      size="small"
      defaultChecked={defaultChecked}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={`cursor-pointer ${className ?? ""}`}
      sx={{
        cursor: disabled ? "not-allowed" : "pointer",
        "& input": { cursor: disabled ? "not-allowed" : "pointer" },
        "& .MuiSvgIcon-root": { cursor: disabled ? "not-allowed" : "pointer" },
        ...sx,
      }}
    />
  );

  if (!label) {
    return checkbox;
  }

  return (
    <label
      className={`inline-flex items-center gap-2 select-none ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${className ?? ""}`}
    >
      {checkbox}
      <span className="text-sm font-medium text-foreground">{label}</span>
    </label>
  );
}