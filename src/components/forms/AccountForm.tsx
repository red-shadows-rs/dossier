"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { updateAccountAction } from "@/server/actions/account";

export function AccountForm({
  name,
  locale,
  signerTitleAr,
  signerTitleEn,
  canSignForCompany,
}: {
  name: string;
  locale: "ar" | "en";
  signerTitleAr: string;
  signerTitleEn: string;
  canSignForCompany: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setFieldErrors({});
    setStatusError(null);
    const result = await updateAccountAction({
      name: String(data.get("name") ?? ""),
      locale: String(data.get("locale") ?? "ar"),
      signerTitleAr: String(data.get("signerTitleAr") ?? ""),
      signerTitleEn: String(data.get("signerTitleEn") ?? ""),
    });
    setPending(false);
    if (result.ok) {
      toast({ title: t("account.saved"), tone: "success" });
      return;
    }
    if (result.error.fieldErrors) {
      setFieldErrors(result.error.fieldErrors);
    }
    const msg =
      result.error.code === "VALIDATION_FAILED"
        ? t("auth.requiredFields")
        : t(`errors.${result.error.code}`);
    setStatusError(msg);
    toast({ title: msg, tone: "error" });
  }

  const fieldError = (key: string): string | null => {
    const value = fieldErrors[key];
    return value ? t(value) : null;
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {statusError ? (
        <p
          role="alert"
          className="rounded border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive"
        >
          {statusError}
        </p>
      ) : null}
      <Field
        label={t("account.name")}
        htmlFor="account-name"
        error={fieldError("name")}
        required
      >
        <Input
          id="account-name"
          name="name"
          defaultValue={name}
          maxLength={200}
        />
      </Field>

      <Field label={t("account.locale")} htmlFor="account-locale">
        <Select id="account-locale" name="locale" defaultValue={locale}>
          <option value="ar">{t("locale.ar")}</option>
          <option value="en">{t("locale.en")}</option>
        </Select>
      </Field>

      {canSignForCompany ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label={t("account.signerTitleAr")}
            htmlFor="account-title-ar"
            error={fieldError("signerTitleAr")}
          >
            <Input
              id="account-title-ar"
              name="signerTitleAr"
              dir="rtl"
              lang="ar"
              defaultValue={signerTitleAr}
              className="text-start"
            />
          </Field>
          <Field
            label={t("account.signerTitleEn")}
            htmlFor="account-title-en"
            error={fieldError("signerTitleEn")}
          >
            <Input
              id="account-title-en"
              name="signerTitleEn"
              dir="ltr"
              lang="en"
              defaultValue={signerTitleEn}
              className="text-start"
            />
          </Field>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" loading={pending} className="gap-2">
          <Save className="h-4 w-4" />
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
