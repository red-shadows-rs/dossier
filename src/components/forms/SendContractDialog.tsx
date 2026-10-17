"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PenTool, Send, Type, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { sendContractAction } from "@/server/actions/contracts";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

export type SignerOption = {
  id: string;
  name: string;
  titleAr: string | null;
  titleEn: string | null;
  isSelf: boolean;
};

export function SendContractDialog({
  open,
  onClose,
  contractId,
  signers,
  languageMode,
  clientDefaults,
  consentText,
  requireProviderSignature,
}: {
  open: boolean;
  onClose: () => void;
  contractId: string;
  signers: SignerOption[];
  languageMode: "ar" | "en";
  clientDefaults: { name: string; title: string; email: string };
  consentText: string;
  requireProviderSignature: boolean;
}) {
  const t = useTranslations();
  const tContracts = useTranslations("contracts");
  const toast = useToast();
  const router = useRouter();
  const padRef = useRef<SignaturePadHandle>(null);
  const [method, setMethod] = useState<"drawn" | "typed">("drawn");
  const [points, setPoints] = useState(0);
  const [typedName, setTypedName] = useState("");
  const [consent, setConsent] = useState(!requireProviderSignature);
  const [signerId, setSignerId] = useState(
    signers.find((s) => s.isSelf)?.id ?? signers[0]?.id ?? "",
  );
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<string | null>(null);

  const signer = signers.find((s) => s.id === signerId);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatusError(null);
    if (requireProviderSignature) {
      if (!consent) {
        setFieldErrors({ consent: "errors.required" });
        setStatusError(t("auth.requiredFields"));
        return;
      }
      if (method === "drawn" && points < 20) {
        setFieldErrors({ signature: "errors.tooShort" });
        setStatusError(t("errors.tooShort"));
        return;
      }
      if (method === "typed" && typedName.trim() === "") {
        setFieldErrors({ signature: "errors.required" });
        setStatusError(t("auth.requiredFields"));
        return;
      }
    }
    const signature = requireProviderSignature
      ? method === "drawn"
        ? {
            method: "drawn" as const,
            dataUrl: padRef.current?.dataUrl ?? undefined,
          }
        : { method: "typed" as const, typedName }
      : undefined;

    setPending(true);
    setFieldErrors({});
    const result = await sendContractAction({
      id: contractId,
      providerSignerUserId: signerId,
      providerName: String(data.get("providerName") ?? ""),
      providerTitle: String(data.get("providerTitle") ?? ""),
      clientSignatoryName: String(data.get("clientName") ?? ""),
      clientSignatoryEmail: String(data.get("clientEmail") ?? ""),
      clientSignatoryTitle: String(data.get("clientTitle") ?? ""),
      signature,
      consent,
      consentText,
    });
    setPending(false);
    if (result.ok) {
      toast({ title: tContracts("send.sent"), tone: "success" });
      onClose();
      router.refresh();
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    const msg =
      result.error.code === "VALIDATION_FAILED"
        ? t("auth.requiredFields")
        : t(`errors.${result.error.code}`);
    setStatusError(msg);
    toast({ title: msg, tone: "error" });
  }

  const err = (key: string) => {
    const value = fieldErrors[key];
    return value ? t(value) : null;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tContracts("send.title")}
      className="w-[min(44rem,calc(100vw-2rem))]"
    >
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
          label={tContracts("send.providerSigner")}
          htmlFor="send-signer"
          required
        >
          <Select
            id="send-signer"
            value={signerId}
            onChange={(event) => setSignerId(event.target.value)}
            disabled={pending}
          >
            {signers.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label={tContracts("send.providerName")}
            htmlFor="send-provider-name"
          >
            <Input
              id="send-provider-name"
              name="providerName"
              defaultValue={signer?.name ?? ""}
              disabled={pending}
            />
          </Field>
          <Field
            label={tContracts("send.providerTitle")}
            htmlFor="send-provider-title"
          >
            <Input
              id="send-provider-title"
              name="providerTitle"
              defaultValue={
                (languageMode === "ar" ? signer?.titleAr : signer?.titleEn) ??
                ""
              }
              disabled={pending}
            />
          </Field>
        </div>

        <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <legend className="mb-1 text-sm font-medium">
            {tContracts("send.clientSignatory")}
          </legend>
          <Field
            label={tContracts("send.clientName")}
            htmlFor="send-client-name"
            required
          >
            <Input
              id="send-client-name"
              name="clientName"
              defaultValue={clientDefaults.name}
              disabled={pending}
            />
          </Field>
          <Field
            label={tContracts("send.clientTitle")}
            htmlFor="send-client-title"
          >
            <Input
              id="send-client-title"
              name="clientTitle"
              defaultValue={clientDefaults.title}
              disabled={pending}
            />
          </Field>
          <Field
            label={tContracts("send.clientEmail")}
            htmlFor="send-client-email"
            required
          >
            <Input
              id="send-client-email"
              name="clientEmail"
              type="email"
              dir="ltr"
              defaultValue={clientDefaults.email}
              disabled={pending}
              className="text-start"
            />
          </Field>
        </fieldset>

        {requireProviderSignature ? (
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
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
                <span>{tContracts("send.drawn")}</span>
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
                <span>{tContracts("send.typed")}</span>
              </button>
            </div>

            {method === "drawn" ? (
              <SignaturePad
                ref={padRef}
                onChange={(valid) => {
                  setPoints(padRef.current?.pointCount ?? 0);
                  if (valid) setFieldErrors((e) => ({ ...e, signature: "" }));
                }}
              />
            ) : (
              <Field
                label={tContracts("send.typedName")}
                htmlFor="send-typed"
                error={err("signature")}
              >
                <Input
                  id="send-typed"
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
                setFieldErrors((e) => ({ ...e, consent: "" }));
              }}
              disabled={pending}
              label={<span>{consentText}</span>}
            />
            {err("consent") || err("signature") ? (
              <p role="alert" className="text-xs text-destructive">
                {err("consent") ?? err("signature")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={pending} className="gap-2">
            <Send className="h-4 w-4" />
            {tContracts("send.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
