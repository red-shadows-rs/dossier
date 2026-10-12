"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LogIn, Lock, Mail } from "lucide-react";
import InputAdornment from "@mui/material/InputAdornment";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ErrorCode } from "@/lib/errors";
import { loginAction } from "@/server/actions/auth";

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const rtl = locale === "ar";
  const withAdornment = (icon: ReactNode) =>
    rtl
      ? { endAdornment: <InputAdornment position="end">{icon}</InputAdornment> }
      : {
          startAdornment: <InputAdornment position="start">{icon}</InputAdornment>,
        };
  const [error, setError] = useState<ErrorCode | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    if (!email.trim() || !password) {
      setError(null);
      setStatus(t("auth.requiredFields"));
      return;
    }
    setStatus(null);
    setPending(true);
    setError(null);
    const result = await loginAction({
      email,
      password,
    });
    if (result.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    setPending(false);
    setError(result.error.code);
  }

  const message =
    error === "RATE_LIMITED"
      ? t("errors.RATE_LIMITED")
      : error === "VALIDATION_FAILED"
        ? t("errors.VALIDATION_FAILED")
        : error
          ? t("auth.invalidCredentials")
          : null;

  const displayed = status ?? message;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex w-full max-w-sm flex-col gap-4"
    >
      {displayed ? (
        <p
          role="alert"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-destructive"
        >
          {displayed}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          {t("auth.email")}
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          dir="ltr"
          {...withAdornment(<Mail size={16} aria-hidden="true" />)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          {t("auth.password")}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          {...withAdornment(<Lock size={16} aria-hidden="true" />)}
        />
      </div>

      <Button type="submit" loading={pending}>
        {pending ? null : <LogIn size={16} aria-hidden="true" />}
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </Button>
    </form>
  );
}
