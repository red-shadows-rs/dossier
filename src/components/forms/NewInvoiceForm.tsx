// Dossier - New Invoice Form Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { FilePlus2, Receipt, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { PaymentMethodsSelector } from "@/components/forms/PaymentMethodsSelector";
import { SUPPORTED_CURRENCIES, INVOICE_LANG_MODES } from "@/lib/constants";
import type { BankAccount } from "@/lib/validation/settings";
import { createInvoiceAction } from "@/server/actions/invoices";

export function NewInvoiceForm({
  projects,
  defaultLanguageMode = "ar",
  defaultCurrency = "SAR",
  bankAccounts = [],
}: {
  projects: { id: string; label: string }[];
  defaultLanguageMode?: string;
  defaultCurrency?: string;
  bankAccounts?: BankAccount[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => {
    const primary = bankAccounts.find((a) => a.isActive && a.isPrimary);
    if (primary) return [primary.id];
    const active = bankAccounts.filter((a) => a.isActive).map((a) => a.id);
    if (active.length > 0) return [active[0]];
    return bankAccounts.length > 0 ? [bankAccounts[0].id] : [];
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const projectId = String(data.get("projectId") ?? "");
    if (!projectId) {
      setStatusError(t("auth.requiredFields"));
      return;
    }
    if (bankAccounts.length > 0 && selectedAccountIds.length === 0) {
      setStatusError(
        locale === "ar"
          ? "يجب اختيار طريقة دفع واحدة على الأقل"
          : "At least one payment method must be selected",
      );
      return;
    }
    setPending(true);
    setStatusError(null);
    const result = await createInvoiceAction({
      projectId,
      currency: String(data.get("currency") ?? "SAR"),
      languageMode: String(data.get("languageMode") ?? "ar"),
      notesAr: String(data.get("notesAr") ?? ""),
      notesEn: String(data.get("notesEn") ?? ""),
      bankAccountIds: selectedAccountIds,
    });
    setPending(false);
    if (result.ok) {
      router.push(`/invoices/${result.data.id}/edit`);
      router.refresh();
      return;
    }
    const msg =
      result.error.code === "VALIDATION_FAILED"
        ? t("auth.requiredFields")
        : t(`errors.${result.error.code}`);
    setStatusError(msg);
    toast({ title: msg, tone: "error" });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 pb-28">
      {statusError && (
        <div
          role="alert"
          className="rounded border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive animate-in fade-in-50"
        >
          {statusError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Receipt size={18} className="text-primary" aria-hidden="true" />
            <span>{t("invoices.newTitle")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label={t("invoices.project")}
              htmlFor="ni-project"
              required
              className="md:col-span-2"
            >
              <Select
                id="ni-project"
                name="projectId"
                disabled={pending}
              >
                <option value="">{t("invoices.selectProject")}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("invoices.languageMode")} htmlFor="ni-lang">
              <Select
                id="ni-lang"
                name="languageMode"
                defaultValue={defaultLanguageMode}
                disabled={pending}
              >
                {INVOICE_LANG_MODES.map((value) => (
                  <option key={value} value={value}>
                    {t(`invoices.languageModes.${value}`)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("invoices.currency")} htmlFor="ni-currency">
              <Select
                id="ni-currency"
                name="currency"
                defaultValue={defaultCurrency}
                disabled={pending}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} - {locale === "ar" ? c.nameAr : c.nameEn}
                  </option>
                ))}
              </Select>
            </Field>

            {bankAccounts.length > 0 ? (
              <div className="md:col-span-2">
                <PaymentMethodsSelector
                  accounts={bankAccounts}
                  selectedIds={selectedAccountIds}
                  onChange={setSelectedAccountIds}
                  disabled={pending}
                />
              </div>
            ) : null}

            <Field
              label={t("invoices.notesAr")}
              htmlFor="ni-notes-ar"
              className="md:col-span-2"
            >
              <Textarea
                id="ni-notes-ar"
                name="notesAr"
                dir="rtl"
                lang="ar"
                rows={3}
                disabled={pending}
                placeholder={t("invoices.placeholders.notesAr")}
                className="text-start"
              />
            </Field>

            <Field
              label={t("invoices.notesEn")}
              htmlFor="ni-notes-en"
              className="md:col-span-2"
            >
              <Textarea
                id="ni-notes-en"
                name="notesEn"
                dir="ltr"
                lang="en"
                rows={3}
                disabled={pending}
                placeholder={t("invoices.placeholders.notesEn")}
                className="text-start"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-card p-3 shadow-sm">
        <Link href="/invoices">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            className="gap-1.5 text-xs sm:text-sm"
          >
            <X className="h-4 w-4" />
            <span>{t("common.cancel")}</span>
          </Button>
        </Link>

        <Button
          type="submit"
          loading={pending}
          className="gap-2 px-5 font-medium text-xs sm:text-sm shadow-xs ms-auto"
        >
          <FilePlus2 className="h-4 w-4" />
          <span>{t("invoices.createDraft")}</span>
        </Button>
      </div>
    </form>
  );
}
