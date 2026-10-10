// Dossier - Client Form Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { CLIENT_TYPES, LOCALES } from "@/lib/constants";
import {
  createClientAction,
  updateClientAction,
} from "@/server/actions/clients";

export type ClientFormValues = {
  type: "company" | "individual";
  nameAr: string;
  nameEn: string;
  legalNameAr: string;
  legalNameEn: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  addressAr: string;
  addressEn: string;
  taxNumber: string;
  crNumber: string;
  repNameAr: string;
  repNameEn: string;
  repTitleAr: string;
  repTitleEn: string;
  preferredLanguage: "ar" | "en";
  notes: string;
};

const STEPS = ["basics", "contact", "legal"] as const;
type Step = (typeof STEPS)[number];

const STEP_ICONS = {
  basics: Building2,
  contact: Mail,
  legal: ShieldCheck,
} as const;

export function ClientForm({
  mode,
  clientId,
  initial,
}: {
  mode: "create" | "edit";
  clientId?: string;
  initial: ClientFormValues;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const toast = useToast();
  const router = useRouter();

  const [form, setForm] = useState<ClientFormValues>(initial);
  const [step, setStep] = useState<Step>("basics");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<string | null>(null);

  function patch(next: Partial<ClientFormValues>) {
    setForm((current) => ({ ...current, ...next }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    setStatusError(null);

    const result =
      mode === "create"
        ? await createClientAction(form)
        : await updateClientAction({ ...form, id: clientId });

    setPending(false);
    if (result.ok) {
      toast({ title: t("clients.saved"), tone: "success" });
      const id = result.data ? result.data.id : clientId;
      router.push(`/clients/${id}`);
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

    if (result.error.fieldErrors) {
      const keys = Object.keys(result.error.fieldErrors);
      if (keys.some((k) => k.startsWith("name") || k.startsWith("legalName") || k === "type" || k.startsWith("rep"))) {
        setStep("basics");
      } else if (keys.some((k) => k === "email" || k === "phone" || k === "country" || k === "city" || k.startsWith("address") || k === "notes")) {
        setStep("contact");
      } else if (keys.some((k) => k === "taxNumber" || k === "crNumber")) {
        setStep("legal");
      }
    }
  }

  const fieldError = (name: string): string | null => {
    const key = fieldErrors[name];
    return key ? t(key) : null;
  };

  const currentIndex = STEPS.indexOf(step);

  function goNext() {
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 pb-28">
      <div className="relative sm:sticky sm:top-14 z-20 rounded border border-border bg-card p-1 shadow-xs">
        <nav
          aria-label={t("clients.formSteps.basics")}
          className="flex items-center gap-1 overflow-x-auto touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-1.5"
        >
          {STEPS.map((value, index) => {
            const active = step === value;
            const completed = index < currentIndex;
            const Icon = STEP_ICONS[value];

            return (
              <button
                key={value}
                id={`client-step-btn-${value}`}
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => {
                  setStep(value);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded px-2.5 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer sm:px-3 sm:py-2 sm:text-sm",
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : completed
                      ? "text-foreground hover:bg-muted/60"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold shrink-0",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : completed
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                </div>

                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn(active ? "inline" : "hidden sm:inline")}>
                  {t(`clients.formSteps.${value}`)}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {statusError ? (
        <p
          role="alert"
          className="rounded border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {statusError}
        </p>
      ) : null}

      {step === "basics" && (
        <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Building2 size={18} className="text-primary" aria-hidden="true" />
                <span>{t("clients.identity")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <Field label={t("clients.typeLabel")} htmlFor="client-type">
                <Select
                  id="client-type"
                  value={form.type}
                  onChange={(e) => patch({ type: e.target.value as ClientFormValues["type"] })}
                  disabled={pending}
                >
                  {CLIENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`clients.type.${type}`)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={t("clients.preferredLanguage")} htmlFor="client-lang">
                <Select
                  id="client-lang"
                  value={form.preferredLanguage}
                  onChange={(e) => patch({ preferredLanguage: e.target.value as "ar" | "en" })}
                  disabled={pending}
                >
                  {LOCALES.map((locale) => (
                    <option key={locale} value={locale}>
                      {t(`locale.${locale}`)}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="hidden 2xl:block" />

              <Field
                label={t("clients.nameAr")}
                htmlFor="client-nameAr"
                error={fieldError("nameAr")}
                required
              >
                <Input
                  id="client-nameAr"
                  dir="rtl"
                  lang="ar"
                  value={form.nameAr}
                  onChange={(e) => patch({ nameAr: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("clients.nameEn")}
                htmlFor="client-nameEn"
                error={fieldError("nameEn")}
                required
              >
                <Input
                  id="client-nameEn"
                  dir="ltr"
                  lang="en"
                  value={form.nameEn}
                  onChange={(e) => patch({ nameEn: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("clients.legalNameAr")}
                htmlFor="client-legalNameAr"
                error={fieldError("legalNameAr")}
              >
                <Input
                  id="client-legalNameAr"
                  dir="rtl"
                  lang="ar"
                  value={form.legalNameAr}
                  onChange={(e) => patch({ legalNameAr: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("clients.legalNameEn")}
                htmlFor="client-legalNameEn"
                error={fieldError("legalNameEn")}
              >
                <Input
                  id="client-legalNameEn"
                  dir="ltr"
                  lang="en"
                  value={form.legalNameEn}
                  onChange={(e) => patch({ legalNameEn: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <UserCheck size={18} className="text-primary" aria-hidden="true" />
                <span>{t("clients.representative")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label={t("clients.repNameAr")}
                htmlFor="client-repNameAr"
                error={fieldError("repNameAr")}
              >
                <Input
                  id="client-repNameAr"
                  dir="rtl"
                  lang="ar"
                  value={form.repNameAr}
                  onChange={(e) => patch({ repNameAr: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("clients.repNameEn")}
                htmlFor="client-repNameEn"
                error={fieldError("repNameEn")}
              >
                <Input
                  id="client-repNameEn"
                  dir="ltr"
                  lang="en"
                  value={form.repNameEn}
                  onChange={(e) => patch({ repNameEn: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("clients.repTitleAr")}
                htmlFor="client-repTitleAr"
                error={fieldError("repTitleAr")}
              >
                <Input
                  id="client-repTitleAr"
                  dir="rtl"
                  lang="ar"
                  value={form.repTitleAr}
                  onChange={(e) => patch({ repTitleAr: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("clients.repTitleEn")}
                htmlFor="client-repTitleEn"
                error={fieldError("repTitleEn")}
              >
                <Input
                  id="client-repTitleEn"
                  dir="ltr"
                  lang="en"
                  value={form.repTitleEn}
                  onChange={(e) => patch({ repTitleEn: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "contact" && (
        <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Mail size={18} className="text-primary" aria-hidden="true" />
                <span>{t("clients.contact")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label={t("clients.email")}
                htmlFor="client-email"
                error={fieldError("email")}
              >
                <Input
                  id="client-email"
                  type="email"
                  dir="ltr"
                  value={form.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("clients.phone")}
                htmlFor="client-phone"
                error={fieldError("phone")}
              >
                <Input
                  id="client-phone"
                  type="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("clients.country")}
                htmlFor="client-country"
                error={fieldError("country")}
              >
                <Input
                  id="client-country"
                  dir="ltr"
                  maxLength={2}
                  value={form.country}
                  onChange={(e) => patch({ country: e.target.value })}
                  disabled={pending}
                  className="text-start uppercase font-mono"
                />
              </Field>

              <Field
                label={t("clients.city")}
                htmlFor="client-city"
                error={fieldError("city")}
              >
                <Input
                  id="client-city"
                  value={form.city}
                  onChange={(e) => patch({ city: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <MapPin size={18} className="text-primary" aria-hidden="true" />
                <span>{t("clients.address")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label={t("clients.addressAr")}
                htmlFor="client-addressAr"
                error={fieldError("addressAr")}
                className="md:col-span-2"
              >
                <Textarea
                  id="client-addressAr"
                  dir="rtl"
                  lang="ar"
                  rows={2}
                  value={form.addressAr}
                  onChange={(e) => patch({ addressAr: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("clients.addressEn")}
                htmlFor="client-addressEn"
                error={fieldError("addressEn")}
                className="md:col-span-2"
              >
                <Textarea
                  id="client-addressEn"
                  dir="ltr"
                  lang="en"
                  rows={2}
                  value={form.addressEn}
                  onChange={(e) => patch({ addressEn: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("clients.notes")}
                htmlFor="client-notes"
                error={fieldError("notes")}
                className="md:col-span-2"
              >
                <Textarea
                  id="client-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "legal" && (
        <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" aria-hidden="true" />
                <span>{t("clients.legal")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label={t("clients.taxNumber")}
                htmlFor="client-taxNumber"
                error={fieldError("taxNumber")}
              >
                <Input
                  id="client-taxNumber"
                  dir="ltr"
                  value={form.taxNumber}
                  onChange={(e) => patch({ taxNumber: e.target.value })}
                  disabled={pending}
                  className="text-start font-mono"
                />
              </Field>

              <Field
                label={t("clients.crNumber")}
                htmlFor="client-crNumber"
                error={fieldError("crNumber")}
              >
                <Input
                  id="client-crNumber"
                  dir="ltr"
                  value={form.crNumber}
                  onChange={(e) => patch({ crNumber: e.target.value })}
                  disabled={pending}
                  className="text-start font-mono"
                />
              </Field>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          {currentIndex > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={goPrev}
              disabled={pending}
              className="gap-1.5 text-xs sm:text-sm"
            >
              {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span>{t("common.previous")}</span>
            </Button>
          )}

          {currentIndex < STEPS.length - 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={goNext}
              disabled={pending}
              className="gap-1.5 text-xs sm:text-sm"
            >
              <span>{t("common.next")}</span>
              {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 ms-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={pending}
            className="gap-1.5 text-xs sm:text-sm"
          >
            <X className="h-4 w-4" />
            <span>{t("common.cancel")}</span>
          </Button>

          <Button
            type="submit"
            loading={pending}
            className="gap-2 px-5 font-medium text-xs sm:text-sm shadow-xs"
          >
            <Save className="h-4 w-4" />
            <span>{t("common.save")}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
