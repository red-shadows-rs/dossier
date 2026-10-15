"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Ban, Check, CheckCheck, PenTool, Send, Type, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
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
      <div className="rounded-md border border-border bg-surface p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {t("signedTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("signedBody")}</p>
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="rounded-md border border-border bg-surface p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {t("declinedTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("declinedBody")}</p>
      </div>
    );
  }

  if (requiresOtp && !otpVerified) {
    return (
      <div className="flex flex-col gap-4 rounded-md border border-border p-4">
        <h2 className="text-base font-semibold text-foreground">
          {t("otpTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("otpHint")}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={requestOtp} loading={pending} className="gap-2">
            <Send className="h-4 w-4" />
            {otpSent ? t("resendCode") : t("sendCode")}
          </Button>
          {otpSent ? (
            <span className="self-center text-sm text-muted-foreground">
              {t("codeSent")}
            </span>
          ) : null}
        </div>
        <form onSubmit={verifyOtp} noValidate className="flex items-end gap-2">
          <Field label={t("code")} htmlFor="otp-code" className="flex-1">
            <Input
              id="otp-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              dir="ltr"
              maxLength={6}
              className="text-start tracking-widest"
              disabled={pending}
            />
          </Field>
          <Button type="submit" loading={pending} className="gap-2">
            <Check className="h-4 w-4" />
            {t("verify")}
          </Button>
        </form>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4 rounded-md border border-border p-4"
    >
      <h2 className="text-base font-semibold text-foreground">
        {t("signTitle")}
      </h2>

      <Field label={t("fullName")} htmlFor="sign-name" required>
        <Input
          id="sign-name"
          name="fullName"
          defaultValue={signatoryName}
          disabled={pending}
        />
      </Field>

      <div className="flex gap-2">
        <button
          type="button"
          aria-current={method === "drawn" ? "true" : undefined}
          onClick={() => setMethod("drawn")}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm",
            method === "drawn"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground",
          )}
        >
          <PenTool className="h-4 w-4" />
          <span>{t("drawn")}</span>
        </button>
        <button
          type="button"
          aria-current={method === "typed" ? "true" : undefined}
          onClick={() => setMethod("typed")}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm",
            method === "typed"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground",
          )}
        >
          <Type className="h-4 w-4" />
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
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
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
