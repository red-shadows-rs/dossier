"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { CLIENT_TYPES, LOCALES } from "@/lib/constants";
import {
  createClientAction,
  updateClientAction,
} from "@/server/actions/clients";

export type ClientFormValues = {
  type: "company" | "individual";
  nameAr: string;
  nameEn: string;
  legalNameAr: string;
  legalNameEn: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  addressAr: string;
  addressEn: string;
  taxNumber: string;
  crNumber: string;
  repNameAr: string;
  repNameEn: string;
  repTitleAr: string;
  repTitleEn: string;
  preferredLanguage: "ar" | "en";
  notes: string;
};

type FieldDef = {
  name: keyof ClientFormValues;
  kind: "text" | "textarea";
  dir?: "ltr" | "rtl";
  maxLength?: number;
};

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "identity",
    fields: [
      { name: "nameAr", kind: "text", dir: "rtl" },
      { name: "nameEn", kind: "text", dir: "ltr" },
      { name: "legalNameAr", kind: "text", dir: "rtl" },
      { name: "legalNameEn", kind: "text", dir: "ltr" },
    ],
  },
  {
    title: "contact",
    fields: [
      { name: "email", kind: "text", dir: "ltr" },
      { name: "phone", kind: "text", dir: "ltr" },
      { name: "country", kind: "text", dir: "ltr", maxLength: 2 },
      { name: "city", kind: "text" },
    ],
  },
  {
    title: "legal",
    fields: [
      { name: "taxNumber", kind: "text", dir: "ltr" },
      { name: "crNumber", kind: "text", dir: "ltr" },
    ],
  },
  {
    title: "representative",
    fields: [
      { name: "repNameAr", kind: "text", dir: "rtl" },
      { name: "repNameEn", kind: "text", dir: "ltr" },
      { name: "repTitleAr", kind: "text", dir: "rtl" },
      { name: "repTitleEn", kind: "text", dir: "ltr" },
    ],
  },
  {
    title: "address",
    fields: [
      { name: "addressAr", kind: "textarea", dir: "rtl" },
      { name: "addressEn", kind: "textarea", dir: "ltr" },
      { name: "notes", kind: "textarea" },
    ],
  },
];

export function ClientForm({
  mode,
  clientId,
  initial,
}: {
  mode: "create" | "edit";
  clientId?: string;
  initial: ClientFormValues;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    for (const [key, value] of data.entries()) {
      payload[key] = String(value);
    }
    setPending(true);
    setFieldErrors({});
    const result =
      mode === "create"
        ? await createClientAction(payload)
        : await updateClientAction({ ...payload, id: clientId });
    setPending(false);
    if (result.ok) {
      toast({ title: t("clients.saved"), tone: "success" });
      const id = result.data ? result.data.id : clientId;
      router.push(`/clients/${id}`);
      router.refresh();
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("clients.identity")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t("clients.typeLabel")} htmlFor="client-type">
            <Select
              id="client-type"
              name="type"
              defaultValue={initial.type}
              disabled={pending}
            >
              {CLIENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`clients.type.${type}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("clients.preferredLanguage")} htmlFor="client-lang">
            <Select
              id="client-lang"
              name="preferredLanguage"
              defaultValue={initial.preferredLanguage}
              disabled={pending}
            >
              {LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {t(`locale.${locale}`)}
                </option>
              ))}
            </Select>
          </Field>
          {SECTIONS[0].fields.map((field) => (
            <Field
              key={field.name}
              label={t(`clients.${field.name}`)}
              htmlFor={`client-${field.name}`}
              error={fieldError(field.name)}
              required={field.name === "nameAr" || field.name === "nameEn"}
            >
              <Input
                id={`client-${field.name}`}
                name={field.name}
                dir={field.dir}
                maxLength={field.maxLength}
                defaultValue={initial[field.name] as string}
                disabled={pending}
                className={field.dir ? "text-start" : undefined}
              />
            </Field>
          ))}
        </CardContent>
      </Card>

      {SECTIONS.slice(1).map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{t(`clients.${section.title}`)}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {section.fields.map((field) => (
              <Field
                key={field.name}
                label={t(`clients.${field.name}`)}
                htmlFor={`client-${field.name}`}
                error={fieldError(field.name)}
                className={
                  field.kind === "textarea" ? "md:col-span-2" : undefined
                }
              >
                {field.kind === "textarea" ? (
                  <Textarea
                    id={`client-${field.name}`}
                    name={field.name}
                    dir={field.dir}
                    defaultValue={initial[field.name] as string}
                    disabled={pending}
                    className={field.dir ? "text-start" : undefined}
                  />
                ) : (
                  <Input
                    id={`client-${field.name}`}
                    name={field.name}
                    dir={field.dir}
                    maxLength={field.maxLength}
                    defaultValue={initial[field.name] as string}
                    disabled={pending}
                    className={field.dir ? "text-start" : undefined}
                  />
                )}
              </Field>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={pending}
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={pending}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
