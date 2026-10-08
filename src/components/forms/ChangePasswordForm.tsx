"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setFieldErrors({});
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
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  const fieldError = (key: string): string | null => {
    const value = fieldErrors[key];
    return value ? t(value) : null;
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
          required
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
          required
          minLength={12}
          className="text-start"
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          {t("auth.changePassword")}
        </Button>
      </div>
    </form>
  );
}
