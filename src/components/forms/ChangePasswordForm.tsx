// Dossier - Change Password Form Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { changePasswordAction } from "@/server/actions/account";

export function ChangePasswordForm() {
  const t = useTranslations();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setFieldErrors({});
    setStatusError(null);
    const result = await changePasswordAction({
      currentPassword: String(data.get("currentPassword") ?? ""),
      newPassword: String(data.get("newPassword") ?? ""),
    });
    setPending(false);
    if (result.ok) {
      form.reset();
      toast({ title: t("account.passwordChanged"), tone: "success" });
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
        label={t("auth.currentPassword")}
        htmlFor="current-password"
        error={fieldError("currentPassword")}
        required
      >
        <Input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          className="text-start"
        />
      </Field>

      <Field
        label={t("auth.newPassword")}
        htmlFor="new-password"
        error={fieldError("newPassword")}
        hint={t("auth.passwordTooShort")}
        required
      >
        <Input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          minLength={12}
          className="text-start"
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" loading={pending} className="gap-2">
          <KeyRound className="h-4 w-4" />
          {t("auth.changePassword")}
        </Button>
      </div>
    </form>
  );
}
