"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  Ban,
  Check,
  CheckCheck,
  CheckCircle2,
  KeyRound,
  Mail,
  PenTool,
  RotateCcw,
  Send,
  Type,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input, InputAdornment } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/components/ui/cn";
import {
  declineContractAction,
  requestSigningOtpAction,
  submitClientSignatureAction,
  verifySigningOtpAction,
} from "@/server/actions/signing";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

export function SigningExperience({
  token,
  signatoryName,
  requiresOtp,
  otpVerified: initialOtpVerified,
  consentText,
}: {
  token: string;
  signatoryName: string;
  requiresOtp: boolean;
  otpVerified: boolean;
  consentText: string;
}) {
  const locale = useLocale();
  const t = useTranslations("signing");
  const tr = useTranslations();
  const padRef = useRef<SignaturePadHandle>(null);

  const [otpVerified, setOtpVerified] = useState(initialOtpVerified);
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [method, setMethod] = useState<"drawn" | "typed">("drawn");
  const [points, setPoints] = useState(0);
  const [typedName, setTypedName] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"signed" | "declined" | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  function fail(result: { ok: false; error: { code: string } }): void {
    setError(tr(`errors.${result.error.code}`));
  }

  async function requestOtp() {
    setPending(true);
    setError(null);
    const result = await requestSigningOtpAction({ token });
    setPending(false);
    if (result.ok) {
      setOtpSent(true);
      return;
    }
    fail(result);
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) {
      setError(tr("errors.required"));
      return;
    }
    setPending(true);
    setError(null);
    const result = await verifySigningOtpAction({ token, code });
    setPending(false);
    if (result.ok) {
      setOtpVerified(true);
      return;
    }
    fail(result);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!consent) {
      setError(tr("errors.required"));
      return;
    }
    if (method === "drawn" && points < 20) {
      setError(tr("errors.tooShort"));
      return;
    }
    if (method === "typed" && typedName.trim() === "") {
      setError(tr("errors.required"));
      return;
    }
    const signature =
      method === "drawn"
        ? {
            method: "drawn" as const,
            dataUrl: padRef.current?.dataUrl ?? undefined,
          }
        : { method: "typed" as const, typedName };

    setPending(true);
    setError(null);
    const result = await submitClientSignatureAction({
      token,
      fullName: String(data.get("fullName") ?? ""),
      signature,
      consent,
      consentText,
    });
    setPending(false);
    if (result.ok) {
      setDone("signed");
      return;
    }
    fail(result);
  }

  async function decline() {
    setPending(true);
    setError(null);
    const result = await declineContractAction({ token, reason });
    setPending(false);
    if (result.ok) {
      setDone("declined");
      return;
    }
    fail(result);
  }

  if (done === "signed") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-500">
          <CheckCheck className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {t("signedTitle")}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">{t("signedBody")}</p>
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <XCircle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {t("declinedTitle")}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">{t("declinedBody")}</p>
      </div>
    );
  }

  if (requiresOtp && !otpVerified) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold text-foreground">
                {t("otpTitle")}
              </h2>
              <p className="text-xs text-muted-foreground">{t("otpHint")}</p>
            </div>
          </div>
          <Badge tone={otpSent ? "green" : "blue"}>
            {otpSent
              ? locale === "ar"
                ? "تم إرسال الرمز"
                : "Code Sent"
              : locale === "ar"
                ? "تحقق أمني"
                : "Security Check"}
          </Badge>
        </div>

        {!otpSent ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/30 p-3.5">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <KeyRound className="h-4 w-4 text-primary shrink-0" />
              <span>
                {locale === "ar"
                  ? "انقر على زر الإرسال لاستلام رمز تحقق لمرة واحدة على بريدك الإلكتروني المسجل."
                  : "Click send to receive your one-time 6-digit verification code via email."}
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={requestOtp}
              loading={pending}
              className="gap-2 shrink-0 font-semibold"
            >
              <Send className="h-4 w-4" />
              <span>{t("sendCode")}</span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>
                {locale === "ar"
                  ? "تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح. يرجى إدخال الرمز أدناه."
                  : "Verification code sent to your email. Please enter it below."}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={requestOtp}
              loading={pending}
              className="gap-1.5 shrink-0 text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("resendCode")}</span>
            </Button>
          </div>
        )}

        <form onSubmit={verifyOtp} noValidate className="flex flex-col gap-4 max-w-md">
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <Field label={t("code")} htmlFor="otp-code" className="flex-1 w-full" required>
              <Input
                id="otp-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                dir="ltr"
                maxLength={6}
                placeholder="123456"
                className="font-mono text-center tracking-widest text-lg h-11"
                disabled={pending}
                autoComplete="one-time-code"
                autoFocus={otpSent}
                startAdornment={
                  <InputAdornment position="start">
                    <KeyRound size={16} className="text-muted-foreground" aria-hidden="true" />
                  </InputAdornment>
                }
              />
            </Field>
            <Button
              type="submit"
              loading={pending}
              disabled={pending}
              className="w-full sm:w-auto h-11 px-6 gap-2 shrink-0 font-semibold"
            >
              <Check className="h-4 w-4" />
              <span>{t("verify")}</span>
            </Button>
          </div>

          {error ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </form>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">
          {t("signTitle")}
        </h2>
      </div>

      <Field label={t("fullName")} htmlFor="sign-name" required>
        <Input
          id="sign-name"
          name="fullName"
          defaultValue={signatoryName}
          disabled={pending}
        />
      </Field>

      <div className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1 self-start">
        <button
          type="button"
          onClick={() => setMethod("drawn")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
            method === "drawn"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
        >
          <PenTool className="h-3.5 w-3.5" />
          <span>{t("drawn")}</span>
        </button>
        <button
          type="button"
          onClick={() => setMethod("typed")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
            method === "typed"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
        >
          <Type className="h-3.5 w-3.5" />
          <span>{t("typed")}</span>
        </button>
      </div>

      {method === "drawn" ? (
        <SignaturePad
          ref={padRef}
          onChange={(valid) => {
            setPoints(padRef.current?.pointCount ?? 0);
            if (valid) setError(null);
          }}
        />
      ) : (
        <Field label={t("typedName")} htmlFor="sign-typed">
          <Input
            id="sign-typed"
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
            disabled={pending}
          />
        </Field>
      )}

      <Checkbox
        checked={consent}
        onChange={(event) => {
          setConsent(event.target.checked);
          if (event.target.checked) setError(null);
        }}
        disabled={pending}
        label={<span>{consentText}</span>}
      />

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-2">
        <Button type="submit" loading={pending} className="gap-2">
          <CheckCheck className="h-4 w-4" />
          {t("sign")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setDeclining((value) => !value)}
          disabled={pending}
          className="gap-2"
        >
          <XCircle className="h-4 w-4" />
          {t("decline")}
        </Button>
      </div>

      {declining ? (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <Field label={t("declineReason")} htmlFor="decline-reason">
            <Textarea
              id="decline-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              disabled={pending}
            />
          </Field>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="danger"
              onClick={decline}
              loading={pending}
              className="gap-2"
            >
              <Ban className="h-4 w-4" />
              {t("declineConfirm")}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
