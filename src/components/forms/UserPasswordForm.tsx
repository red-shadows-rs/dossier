// Dossier - User Password Form Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { setUserPasswordAction } from "@/server/actions/users";

export function UserPasswordForm({ userId }: { userId: string }) {
  const t = useTranslations();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = String(new FormData(form).get("password") ?? "");
    setPending(true);
    setError(null);
    const result = await setUserPasswordAction({ id: userId, password });
    setPending(false);
    if (result.ok) {
      toast({ title: t("users.passwordResetToast"), tone: "success" });
      form.reset();
      return;
    }
    const key = result.error.fieldErrors?.password;
    setError(key ? t(key) : t(`errors.${result.error.code}`));
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field
        label={t("users.newPassword")}
        htmlFor="user-new-password"
        error={error}
        required
      >
        <Input
          id="user-new-password"
          name="password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          disabled={pending}
          className="text-start"
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        {t("users.passwordResetHint")}
      </p>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" loading={pending} className="gap-2">
          <KeyRound className="h-4 w-4" />
          {t("users.setPassword")}
        </Button>
      </div>
    </form>
  );
}
