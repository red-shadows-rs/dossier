"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import type { ActionResult } from "@/lib/result";

export type SettingsFieldDef =
  | {
      kind: "text";
      name: string;
      label: string;
      dir?: "ltr" | "rtl";
      maxLength?: number;
      placeholder?: string;
    }
  | {
      kind: "textarea";
      name: string;
      label: string;
      dir?: "ltr" | "rtl";
      rows?: number;
    }
  | {
      kind: "number";
      name: string;
      label: string;
      min?: number;
      max?: number;
      step?: number;
      suffix?: string;
    }
  | {
      kind: "select";
      name: string;
      label: string;
      options: { value: string; label: string }[];
    }
  | { kind: "checkbox"; name: string; label: string }
  | { kind: "numberList"; name: string; label: string; placeholder?: string };

export type SettingsValues = Record<
  string,
  string | number | boolean | number[] | null | undefined
>;

function setNested(
  target: Record<string, unknown>,
  dottedName: string,
  value: unknown,
): void {
  const parts = dottedName.split(".");
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    const next = cursor[key];
    if (typeof next !== "object" || next === null) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}

function readValue(
  field: SettingsFieldDef,
  raw: FormDataEntryValue | null,
): unknown {
  switch (field.kind) {
    case "text":
    case "textarea":
      return String(raw ?? "");
    case "number": {
      const text = String(raw ?? "").trim();
      if (text === "") return undefined;
      return Number(text);
    }
    case "select":
      return String(raw ?? "");
    case "checkbox":
      return raw !== null;
    case "numberList": {
      const text = String(raw ?? "").trim();
      if (text === "") return [];
      return text
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((part) => Number(part));
    }
  }
}

function buildPayload(
  fields: SettingsFieldDef[],
  formData: FormData,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = readValue(field, formData.get(field.name));
    if (value === undefined) continue;
    setNested(payload, field.name, value);
  }
  return payload;
}

function initialValue(
  field: SettingsFieldDef,
  values: SettingsValues,
): string | number | boolean {
  const value = values[field.name];
  if (field.kind === "checkbox") return value === true;
  if (field.kind === "numberList") {
    return Array.isArray(value) ? value.join(", ") : "";
  }
  if (value === null || value === undefined) return "";
  return value as string | number;
}

export function SettingsForm({
  fields,
  values,
  action,
  disabled,
}: {
  fields: SettingsFieldDef[];
  values: SettingsValues;
  action: (input: unknown) => Promise<ActionResult<null>>;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = buildPayload(fields, new FormData(event.currentTarget));
    setPending(true);
    setFieldErrors({});
    const result = await action(payload);
    setPending(false);
    if (result.ok) {
      toast({ title: t("settings.saved"), tone: "success" });
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  const fieldError = (name: string): string | null => {
    const key = fieldErrors[name];
    return key ? t(key) : null;
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const error = fieldError(field.name);
          if (field.kind === "checkbox") {
            return (
              <Checkbox
                key={field.name}
                name={field.name}
                defaultChecked={initialValue(field, values) === true}
                disabled={disabled}
                label={field.label}
              />
            );
          }
          return (
            <Field
              key={field.name}
              label={field.label}
              htmlFor={`field-${field.name}`}
              error={error}
              className={
                field.kind === "textarea" ? "md:col-span-2" : undefined
              }
            >
              {field.kind === "text" ? (
                <Input
                  id={`field-${field.name}`}
                  name={field.name}
                  dir={field.dir}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  defaultValue={initialValue(field, values) as string}
                  disabled={disabled}
                  className={field.dir ? "text-start" : undefined}
                />
              ) : null}
              {field.kind === "textarea" ? (
                <Textarea
                  id={`field-${field.name}`}
                  name={field.name}
                  dir={field.dir}
                  rows={field.rows}
                  defaultValue={initialValue(field, values) as string}
                  disabled={disabled}
                  className={field.dir ? "text-start" : undefined}
                />
              ) : null}
              {field.kind === "number" ? (
                <div className="flex items-center gap-2">
                  <Input
                    id={`field-${field.name}`}
                    name={field.name}
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    defaultValue={initialValue(field, values) as number}
                    disabled={disabled}
                    dir="ltr"
                    className="text-start"
                  />
                  {field.suffix ? (
                    <span className="text-sm text-muted-foreground">
                      {field.suffix}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {field.kind === "select" ? (
                <Select
                  id={`field-${field.name}`}
                  name={field.name}
                  defaultValue={String(initialValue(field, values))}
                  disabled={disabled}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : null}
              {field.kind === "numberList" ? (
                <Input
                  id={`field-${field.name}`}
                  name={field.name}
                  dir="ltr"
                  placeholder={field.placeholder}
                  defaultValue={initialValue(field, values) as string}
                  disabled={disabled}
                  className="text-start"
                />
              ) : null}
            </Field>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={disabled}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
