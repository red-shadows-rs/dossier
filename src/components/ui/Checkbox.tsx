"use client";

import type { ChangeEventHandler, ReactNode } from "react";
import MuiCheckbox from "@mui/material/Checkbox";
import MuiFormControlLabel from "@mui/material/FormControlLabel";

export function Checkbox({
  id,
  name,
  value,
  label,
  defaultChecked,
  checked,
  onChange,
  disabled,
}: {
  id?: string;
  name?: string;
  value?: string;
  label: ReactNode;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
}) {
  return (
    <MuiFormControlLabel
      control={
        <MuiCheckbox
          id={id}
          name={name}
          value={value}
          size="small"
          defaultChecked={defaultChecked}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
      }
      label={label}
      sx={{ mr: 0 }}
    />
  );
}