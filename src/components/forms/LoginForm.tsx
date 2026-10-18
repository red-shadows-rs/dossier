// Dossier - Login Form Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, LogIn, Lock, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, InputAdornment } from "@/components/ui/Input";
import type { ErrorCode } from "@/lib/errors";
import { loginAction } from "@/server/actions/auth";
import { loginAsDemoAction } from "@/server/actions/demo";

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<ErrorCode | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
          startAdornment={
            <InputAdornment position="start">
              <Mail size={16} aria-hidden="true" />
            </InputAdornment>
          }
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          {t("auth.password")}
        </label>
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          startAdornment={
            <InputAdornment position="start">
              <Lock size={16} aria-hidden="true" />
            </InputAdornment>
          }
          endAdornment={
            <InputAdornment position="end">
              <Button
                type="button"
                size="icon-sm"
                aria-label={
                  showPassword ? t("auth.hidePassword") : t("auth.showPassword")
                }
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? (
                  <EyeOff size={16} aria-hidden="true" />
                ) : (
                  <Eye size={16} aria-hidden="true" />
                )}
              </Button>
            </InputAdornment>
          }
        />
      </div>

      <Button type="submit" loading={pending}>
        {pending ? null : <LogIn size={16} aria-hidden="true" />}
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </Button>

      <div className="relative my-2 flex items-center justify-center">
        <div className="w-full border-t border-border" />
        <span className="absolute bg-background px-2 text-xs uppercase tracking-wider text-muted-foreground">
          {t("common.or")}
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const result = await loginAsDemoAction();
          if (result.ok) {
            router.replace("/");
            router.refresh();
            return;
          }
          setPending(false);
        }}
        className="w-full gap-2 border-border bg-card py-2.5 text-foreground hover:bg-accent hover:text-accent-foreground font-medium shadow-sm transition-colors"
      >
        <Sparkles size={16} className="text-primary shrink-0" aria-hidden="true" />
        <span>{t("demo.tryDemoButton")}</span>
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {t("demo.tryDemoDesc")}
      </p>
    </form>
  );
}