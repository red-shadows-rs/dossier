"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ErrorCode } from "@/lib/errors";
import { loginAction } from "@/server/actions/auth";

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = await loginAction({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
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

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      {message ? (
        <p
          role="alert"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-destructive"
        >
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          {t("auth.email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          dir="ltr"
          className="rounded-md border border-border bg-surface px-3 py-2 text-start text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          {t("auth.password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          className="rounded-md border border-border bg-surface px-3 py-2 text-start text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </button>
    </form>
  );
}
