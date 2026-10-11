import { forwardRef, type InputHTMLAttributes } from "react";
import MuiOutlinedInput from "@mui/material/OutlinedInput";
import type { OutlinedInputProps } from "@mui/material/OutlinedInput";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
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