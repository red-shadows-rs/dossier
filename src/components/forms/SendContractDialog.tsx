"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, PenTool, Send, Type, User, X, FileCheck2 } from "lucide-react";
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
  const [, setPoints] = useState(0);
  const [typedName, setTypedName] = useState("");
  const [consent, setConsent] = useState(!requireProviderSignature);

  const initialSigner = signers.find((s) => s.isSelf) ?? signers[0];
  const [signerId, setSignerId] = useState(initialSigner?.id ?? "");
  const [providerName, setProviderName] = useState(initialSigner?.name ?? "");
  const [providerTitle, setProviderTitle] = useState(
    (languageMode === "ar" ? initialSigner?.titleAr : initialSigner?.titleEn) ?? "",
  );

  const [clientName, setClientName] = useState(clientDefaults.name ?? "");
  const [clientTitle, setClientTitle] = useState(clientDefaults.title ?? "");
  const [clientEmail, setClientEmail] = useState(clientDefaults.email ?? "");

  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleSignerChange = (newId: string) => {
    setSignerId(newId);
    const s = signers.find((opt) => opt.id === newId);
    if (s) {
      setProviderName(s.name);
      setProviderTitle(
        (languageMode === "ar" ? s.titleAr : s.titleEn) ?? "",
      );
    }
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusError(null);

    if (requireProviderSignature) {
      if (!consent) {
        setFieldErrors({ consent: "errors.required" });
        setStatusError(t("auth.requiredFields"));
        return;
      }
      if (method === "drawn") {
        const dataUrl = padRef.current?.dataUrl;
        const pts = padRef.current?.pointCount ?? 0;
        if (!dataUrl || pts < 5) {
          const msg = "يرجى رسم التوقيع داخل المربع المخصص";
          setFieldErrors({ signature: msg });
          setStatusError(msg);
          return;
        }
      }
      if (method === "typed" && typedName.trim() === "") {
        const msg = "اسم الموقع مطلوب للاعتماد";
        setFieldErrors({ signature: msg });
        setStatusError(msg);
        return;
      }
    }

    const signature = requireProviderSignature
      ? method === "drawn"
        ? {
            method: "drawn" as const,
            dataUrl: padRef.current?.dataUrl ?? undefined,
          }
        : { method: "typed" as const, typedName: typedName.trim() }
      : undefined;

    setPending(true);
    setFieldErrors({});

    const result = await sendContractAction({
      id: contractId,
      providerSignerUserId: signerId,
      providerName: providerName.trim(),
      providerTitle: providerTitle.trim(),
      clientSignatoryName: clientName.trim(),
      clientSignatoryEmail: clientEmail.trim(),
      clientSignatoryTitle: clientTitle.trim(),
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
    if (!value) return null;
    return value.startsWith("errors.") || value.startsWith("contracts.")
      ? t(value)
      : value;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tContracts("send.title")}
      maxWidth="md"
      className="max-w-2xl w-full"
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {statusError ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {statusError}
          </p>
        ) : null}

        {/* Section 1: Provider Signer */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            <span>{tContracts("send.providerSigner")}</span>
          </div>

          {signers.length > 1 ? (
            <Field
              label={tContracts("send.providerSigner")}
              htmlFor="send-signer"
              required
            >
              <Select
                id="send-signer"
                value={signerId}
                onChange={(event) => handleSignerChange(event.target.value)}
                disabled={pending}
              >
                {signers.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={tContracts("send.providerName")}
              htmlFor="send-provider-name"
              required
              error={err("providerName")}
            >
              <Input
                id="send-provider-name"
                name="providerName"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                disabled={pending}
                placeholder="اسم المفوض بالتوقيع"
              />
            </Field>

            <Field
              label={tContracts("send.providerTitle")}
              htmlFor="send-provider-title"
              error={err("providerTitle")}
            >
              <Input
                id="send-provider-title"
                name="providerTitle"
                value={providerTitle}
                onChange={(e) => setProviderTitle(e.target.value)}
                disabled={pending}
                placeholder="المسمى الوظيفي"
              />
            </Field>
          </div>
        </div>

        {/* Section 2: Client Signatory */}
        <div className="flex flex-col gap-3.5 border-t border-border/60 pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <User className="h-4 w-4 text-primary" />
            <span>{tContracts("send.clientSignatory")}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label={tContracts("send.clientName")}
              htmlFor="send-client-name"
              error={err("clientSignatoryName")}
            >
              <Input
                id="send-client-name"
                name="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={pending}
                placeholder={languageMode === "ar" ? "اسم العميل أو ممثله" : "Client or representative name"}
              />
            </Field>

            <Field
              label={tContracts("send.clientTitle")}
              htmlFor="send-client-title"
              error={err("clientSignatoryTitle")}
            >
              <Input
                id="send-client-title"
                name="clientTitle"
                value={clientTitle}
                onChange={(e) => setClientTitle(e.target.value)}
                disabled={pending}
                placeholder="المسمى الوظيفي"
              />
            </Field>

            <Field
              label={tContracts("send.clientEmail")}
              htmlFor="send-client-email"
              required
              error={err("clientSignatoryEmail")}
            >
              <Input
                id="send-client-email"
                name="clientEmail"
                type="email"
                dir="ltr"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                disabled={pending}
                className="text-start"
                placeholder="client@example.com"
              />
            </Field>
          </div>
        </div>

        {/* Section 3: Signature & Consent */}
        {requireProviderSignature ? (
          <div className="flex flex-col gap-3.5 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <FileCheck2 className="h-4 w-4 text-primary" />
                <span>اعتماد العقد والتوقيع الإلكتروني</span>
              </div>

              {/* Segmented Control */}
              <div className="inline-flex rounded-md border border-border/80 bg-muted/30 p-0.5">
                <button
                  type="button"
                  aria-current={method === "drawn" ? "true" : undefined}
                  onClick={() => setMethod("drawn")}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    method === "drawn"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <PenTool className="h-3.5 w-3.5" />
                  <span>{tContracts("send.drawn")}</span>
                </button>
                <button
                  type="button"
                  aria-current={method === "typed" ? "true" : undefined}
                  onClick={() => setMethod("typed")}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    method === "typed"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Type className="h-3.5 w-3.5" />
                  <span>{tContracts("send.typed")}</span>
                </button>
              </div>
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
              <div className="flex flex-col gap-3">
                <Field
                  label={tContracts("send.typedName")}
                  htmlFor="send-typed"
                  error={err("signature")}
                  required
                >
                  <Input
                    id="send-typed"
                    value={typedName}
                    onChange={(event) => {
                      setTypedName(event.target.value);
                      if (event.target.value.trim()) {
                        setFieldErrors((e) => ({ ...e, signature: "" }));
                      }
                    }}
                    disabled={pending}
                    placeholder="اكتب اسمك للاعتماد كـ توقيع إلكتروني"
                  />
                </Field>

                {/* Calligraphic Preview */}
                <div className="flex h-20 w-full items-center justify-center rounded-lg border border-border/80 bg-card px-4 text-center select-none shadow-inner">
                  <span className="font-serif text-2xl italic tracking-wide text-foreground">
                    {typedName.trim() || "توقيع بالاسم المكتوب"}
                  </span>
                </div>
              </div>
            )}

            {/* Consent Checkbox */}
            <div className="pt-1">
              <Checkbox
                checked={consent}
                onChange={(event) => {
                  setConsent(event.target.checked);
                  if (event.target.checked) {
                    setFieldErrors((e) => ({ ...e, consent: "" }));
                  }
                }}
                disabled={pending}
                label={<span className="text-xs font-medium leading-relaxed">{consentText}</span>}
              />
            </div>

            {err("consent") || err("signature") ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {err("consent") ?? err("signature")}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
            className="gap-2 px-5"
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            loading={pending}
            className="gap-2 px-6 shadow-sm"
          >
            <Send className="h-4 w-4" />
            {tContracts("send.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
