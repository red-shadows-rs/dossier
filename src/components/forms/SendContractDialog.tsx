"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  languageMode: "ar" | "en" | "bilingual";
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

  const signer = signers.find((s) => s.id === signerId);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (requireProviderSignature) {
      if (!consent) {
        setFieldErrors({ consent: "errors.required" });
        return;
      }
      if (method === "drawn" && points < 20) {
        setFieldErrors({ signature: "errors.tooShort" });
        return;
      }
      if (method === "typed" && typedName.trim() === "") {
        setFieldErrors({ signature: "errors.required" });
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
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
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
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
              required
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
              required
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
                  "rounded-md border px-3 py-1.5 text-sm",
                  method === "drawn"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {tContracts("send.drawn")}
              </button>
              <button
                type="button"
                aria-current={method === "typed" ? "true" : undefined}
                onClick={() => setMethod("typed")}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  method === "typed"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {tContracts("send.typed")}
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
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={pending}>
            {tContracts("send.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
