import type { ReactNode } from "react";
import { cn } from "./cn";
import { Field } from "./Field";
import { Input } from "./Input";
import { Textarea } from "./Textarea";

export type BilingualFieldProps = {
  labelAr: ReactNode;
  labelEn: ReactNode;
  nameAr: string;
  nameEn: string;
  defaultValueAr?: string;
  defaultValueEn?: string;
  errorAr?: string | null;
  errorEn?: string | null;
  multiline?: boolean;
  required?: boolean;
  className?: string;
};

export function BilingualField({
  labelAr,
  labelEn,
  nameAr,
  nameEn,
  defaultValueAr,
  defaultValueEn,
  errorAr,
  errorEn,
  multiline,
  required,
  className,
}: BilingualFieldProps) {
  const Control = multiline ? Textarea : Input;
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", className)}>
      <Field
        label={labelAr}
        htmlFor={nameAr}
        error={errorAr}
        required={required}
      >
        <Control
          id={nameAr}
          name={nameAr}
          dir="rtl"
          lang="ar"
          defaultValue={defaultValueAr}
          required={required}
          className="text-start"
        />
      </Field>
      <Field
        label={labelEn}
        htmlFor={nameEn}
        error={errorEn}
        required={required}
      >
        <Control
          id={nameEn}
          name={nameEn}
          dir="ltr"
          lang="en"
          defaultValue={defaultValueEn}
          required={required}
          className="text-start"
        />
      </Field>
    </div>
  );
}
