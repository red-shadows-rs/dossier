import type { ReactNode } from "react";
import MuiFormControl from "@mui/material/FormControl";
import MuiFormHelperText from "@mui/material/FormHelperText";
import MuiFormLabel from "@mui/material/FormLabel";

export type FieldProps = {
  label: ReactNode;
  htmlFor?: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  requiredMark?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  requiredMark,
  className,
  children,
}: FieldProps) {
  return (
    <MuiFormControl
      fullWidth
      size="small"
      error={Boolean(error)}
      required={required}
      className={className}
    >
      <MuiFormLabel
        htmlFor={htmlFor}
        sx={{ "& .MuiFormLabel-asterisk": { display: "none" } }}
      >
        {label}
        {required ? (
          requiredMark ?? (
            <span
              aria-hidden="true"
              className="ms-1 align-super text-xs text-primary"
            >
              *
            </span>
          )
        ) : null}
      </MuiFormLabel>
      {children}
      {hint && !error ? <MuiFormHelperText>{hint}</MuiFormHelperText> : null}
      {error ? (
        <MuiFormHelperText role="alert">{error}</MuiFormHelperText>
      ) : null}
    </MuiFormControl>
  );
}