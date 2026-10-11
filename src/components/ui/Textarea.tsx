import { forwardRef, type TextareaHTMLAttributes } from "react";
import MuiOutlinedInput from "@mui/material/OutlinedInput";
import type { OutlinedInputProps } from "@mui/material/OutlinedInput";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <MuiOutlinedInput
      inputRef={ref}
      multiline
      rows={rows}
      size="small"
      fullWidth
      className={className}
      {...(props as unknown as OutlinedInputProps)}
    />
  );
});