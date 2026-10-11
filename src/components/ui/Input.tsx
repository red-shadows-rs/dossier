import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import MuiOutlinedInput from "@mui/material/OutlinedInput";
import type { OutlinedInputProps } from "@mui/material/OutlinedInput";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <MuiOutlinedInput
      inputRef={ref}
      fullWidth
      size="small"
      className={className}
      {...(props as unknown as OutlinedInputProps)}
    />
  );
});