// Dossier - Subscription Form Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  CalendarClock,
  Check,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { PaymentMethodsSelector } from "@/components/forms/PaymentMethodsSelector";
import {
  SUBSCRIPTION_FREQUENCIES,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type DiscountType,
  type SubscriptionFrequency,
} from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { extractAccountIdsFromInstructions } from "@/lib/payment-methods";
import type { BankAccount } from "@/lib/validation/settings";
import type {
  CreateSubscriptionInput,
  SubscriptionItemInput,
} from "@/lib/validation/subscriptions";
import {
  createSubscriptionAction,
  updateSubscriptionAction,
} from "@/server/actions/subscriptions";

type ItemRow = {
  id?: string;
  descriptionAr: string;
  descriptionEn: string;
  quantity: number;
  unitPriceStr: string;
};

export type SubscriptionInitialData = {
  id?: string;
  clientId: string;
  projectId?: string | null;
  titleAr: string;
  titleEn?: string | null;
  description?: string | null;
  frequency: SubscriptionFrequency;
  intervalCount: number;
  startDate: string;
  nextRunDate: string;
  endDate?: string | null;
  languageMode: "ar" | "en";
  currency: string;
  taxRateBp: number;
  discountType: DiscountType;
  discountValue: number;
  paymentTermsDays: number;
  paymentInstructionsAr?: string | null;
  autoIssueInvoice: boolean;
  autoSendEmail: boolean;
  notesAr?: string | null;
  notesEn?: string | null;
  items: Array<{
    id?: string;
    descriptionAr: string;
    descriptionEn?: string | null;
    quantity: number;
    unitPriceMinor: number;
    taxRateBp: number;
  }>;
};

export function SubscriptionForm({
  clients,
  projects,
  bankAccounts,
  initialData,
  today,
}: {
  clients: Array<{ id: string; nameAr: string | null; nameEn: string | null }>;
  projects: Array<{ id: string; clientId: string; code: string; nameAr: string | null; nameEn: string | null }>;
  bankAccounts: BankAccount[];
  initialData?: SubscriptionInitialData;
  today: string;
}) {
  const t = useTranslations("subscriptions");
  const tc = useTranslations("common");
  const rawLocale = useLocale();
  const locale: "ar" | "en" = rawLocale === "en" ? "en" : "ar";
  const isAr = locale === "ar";
  const toast = useToast();
  const router = useRouter();

  const isEdit = Boolean(initialData?.id);
  const [pending, setPending] = useState(false);

  const [clientId, setClientId] = useState(initialData?.clientId ?? (clients[0]?.id || ""));
  const [projectId, setProjectId] = useState(initialData?.projectId ?? "");
  const [titleAr, setTitleAr] = useState(initialData?.titleAr ?? "");
  const [titleEn, setTitleEn] = useState(initialData?.titleEn ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");

  const [frequency, setFrequency] = useState<SubscriptionFrequency>(initialData?.frequency ?? "monthly");
  const [intervalCount, setIntervalCount] = useState<number>(initialData?.intervalCount ?? 1);
  const [startDate, setStartDate] = useState(initialData?.startDate ?? today);
  const [nextRunDate, setNextRunDate] = useState(initialData?.nextRunDate ?? today);
  const [endDate, setEndDate] = useState(initialData?.endDate ?? "");
  const [languageMode] = useState<"ar" | "en">(initialData?.languageMode ?? "ar");
  const [currency, setCurrency] = useState(initialData?.currency ?? "SAR");

  const [taxRateBp, setTaxRateBp] = useState<number>(initialData?.taxRateBp ?? 1500);
  const [discountType, setDiscountType] = useState<DiscountType>(initialData?.discountType ?? "none");
  const [discountValue, setDiscountValue] = useState<number>(initialData?.discountValue ?? 0);
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(initialData?.paymentTermsDays ?? 14);

  const [autoIssueInvoice, setAutoIssueInvoice] = useState(initialData?.autoIssueInvoice ?? true);
  const [autoSendEmail, setAutoSendEmail] = useState(initialData?.autoSendEmail ?? true);

  const [notesAr, setNotesAr] = useState(initialData?.notesAr ?? "");
  const [notesEn, setNotesEn] = useState(initialData?.notesEn ?? "");

  const initialSelectedAccountIds = initialData?.paymentInstructionsAr
    ? extractAccountIdsFromInstructions(initialData.paymentInstructionsAr)
    : bankAccounts.filter((a) => a.isActive).map((a) => a.id);

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    initialSelectedAccountIds.length > 0
      ? initialSelectedAccountIds
      : bankAccounts.length > 0
        ? [bankAccounts[0].id]
        : [],
  );

  const [items, setItems] = useState<ItemRow[]>(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items.map((it) => {
        const factor = 100;
        return {
          id: it.id,
          descriptionAr: it.descriptionAr,
          descriptionEn: it.descriptionEn ?? "",
          quantity: it.quantity,
          unitPriceStr: (it.unitPriceMinor / factor).toFixed(2),
        };
      });
    }
    return [
      {
        descriptionAr: "",
        descriptionEn: "",
        quantity: 1,
        unitPriceStr: "0.00",
      },
    ];
  });

  const clientProjects = projects.filter((p) => p.clientId === clientId);

  function parseUnitPrice(str: string): number {
    const num = Number(str);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.round(num * 100);
  }

  const subtotalMinor = items.reduce((sum, item) => {
    const unitPrice = parseUnitPrice(item.unitPriceStr);
    return sum + unitPrice * Math.max(1, item.quantity);
  }, 0);

  let discountMinor = 0;
  if (discountType === "percent") {
    discountMinor = Math.round((subtotalMinor * discountValue) / 10000);
  } else if (discountType === "fixed") {
    discountMinor = Math.min(discountValue, subtotalMinor);
  }

  const netMinor = Math.max(0, subtotalMinor - discountMinor);
  const taxMinor = Math.round((netMinor * taxRateBp) / 10000);
  const totalMinor = netMinor + taxMinor;

  function handleAddItem() {
    setItems((prev) => [
      ...prev,
      {
        descriptionAr: "",
        descriptionEn: "",
        quantity: 1,
        unitPriceStr: "0.00",
      },
    ]);
  }

  function handleRemoveItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleItemChange<K extends keyof ItemRow>(index: number, key: K, val: ItemRow[K]) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: val };
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!titleAr.trim()) {
      toast({ title: isAr ? "يرجى كتابة عنوان للاشتراك" : "Please provide a subscription title", tone: "error" });
      return;
    }

    if (!clientId) {
      toast({ title: isAr ? "يرجى اختيار العميل" : "Please select a client", tone: "error" });
      return;
    }

    const validItems: SubscriptionItemInput[] = [];
    for (const item of items) {
      if (!item.descriptionAr.trim()) {
        toast({
          title: isAr ? "يرجى ملء وصف جميع بنود الخدمة" : "Please enter descriptions for all items",
          tone: "error",
        });
        return;
      }
      validItems.push({
        id: item.id,
        descriptionAr: item.descriptionAr.trim(),
        descriptionEn: item.descriptionEn.trim() || null,
        quantity: Math.max(1, item.quantity),
        unitPriceMinor: parseUnitPrice(item.unitPriceStr),
        taxRateBp,
      });
    }

    if (validItems.length === 0) {
      toast({ title: isAr ? "يجب إضافة بند واحد على الأقل" : "At least one item is required", tone: "error" });
      return;
    }

    if (bankAccounts.length > 0 && selectedAccountIds.length === 0) {
      toast({
        title: isAr ? "يجب اختيار طريقة دفع واحدة على الأقل" : "Please select at least one payment method",
        tone: "error",
      });
      return;
    }

    setPending(true);

    if (isEdit && initialData?.id) {
      const res = await updateSubscriptionAction(initialData.id, {
        clientId,
        projectId: projectId || null,
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim() || null,
        description: description.trim() || null,
        frequency,
        intervalCount,
        startDate,
        nextRunDate,
        endDate: endDate ? endDate : null,
        languageMode,
        currency: currency as CurrencyCode,
        taxRateBp,
        discountType,
        discountValue,
        paymentTermsDays,
        bankAccountIds: selectedAccountIds,
        autoIssueInvoice,
        autoSendEmail,
        notesAr: notesAr.trim() || null,
        notesEn: notesEn.trim() || null,
        items: validItems,
      });

      setPending(false);
      if (res.ok) {
        toast({ title: t("saved"), tone: "success" });
        router.push(`/subscriptions/${initialData.id}`);
      } else if (!res.ok) {
        const msg =
          res.error.code === "VALIDATION_FAILED" && res.error.fieldErrors
            ? Object.entries(res.error.fieldErrors)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")
            : tc("saveError");
        toast({ title: msg, tone: "error" });
      }
    } else {
      const payload: CreateSubscriptionInput = {
        clientId,
        contractId: null,
        projectId: projectId || null,
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim() || null,
        description: description.trim() || null,
        frequency,
        intervalCount,
        startDate,
        nextRunDate,
        endDate: endDate ? endDate : null,
        languageMode,
        currency: currency as CurrencyCode,
        taxRateBp,
        discountType,
        discountValue,
        paymentTermsDays,
        bankAccountIds: selectedAccountIds,
        autoIssueInvoice,
        autoSendEmail,
        notesAr: notesAr.trim() || null,
        notesEn: notesEn.trim() || null,
        items: validItems,
      };

      const res = await createSubscriptionAction(payload);
      setPending(false);
      if (res.ok && res.data) {
        toast({ title: t("saved"), tone: "success" });
        router.push(`/subscriptions/${res.data.id}`);
      } else if (!res.ok) {
        const msg =
          res.error.code === "VALIDATION_FAILED" && res.error.fieldErrors
            ? Object.entries(res.error.fieldErrors)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")
            : tc("saveError");
        toast({ title: msg, tone: "error" });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* 1. Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CalendarClock size={16} className="text-primary" />
            <span>{t("subscriptionTitle")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t("subscriptionTitle")} htmlFor="sub-title-ar" required>
            <Input
              id="sub-title-ar"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder={t("subscriptionTitlePlaceholder")}
              dir="rtl"
              required
            />
          </Field>

          <Field label={`${t("subscriptionTitle")} (En)`} htmlFor="sub-title-en">
            <Input
              id="sub-title-en"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="e.g. Pro Cloud Hosting 20GB NVMe"
              dir="ltr"
            />
          </Field>

          <Field label={t("client")} htmlFor="sub-client" required>
            <Select
              id="sub-client"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setProjectId("");
              }}
              required
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {isAr ? c.nameAr || c.nameEn : c.nameEn || c.nameAr}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t("project")} htmlFor="sub-project">
            <Select
              id="sub-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">{t("selectProject")}</option>
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {isAr ? p.nameAr || p.nameEn : p.nameEn || p.nameAr}
                </option>
              ))}
            </Select>
          </Field>

          <div className="md:col-span-2">
            <Field label={tc("details")} htmlFor="sub-desc">
              <Textarea
                id="sub-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isAr ? "ملاحظات وتفاصيل إضافية حول خطة الاستضافة أو الخدمة..." : "Additional details..."}
                rows={2}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* 2. Schedule and Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <RefreshCw size={16} className="text-primary" />
            <span>{t("frequency")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Field label={t("frequency")} htmlFor="sub-frequency" required>
            <Select
              id="sub-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as SubscriptionFrequency)}
            >
              {SUBSCRIPTION_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {t(`frequencies.${f}`)}
                </option>
              ))}
            </Select>
          </Field>

          {frequency === "custom" || frequency === "monthly" ? (
            <Field label={t("intervalCount")} htmlFor="sub-interval">
              <Input
                id="sub-interval"
                type="number"
                min={1}
                max={365}
                value={intervalCount}
                onChange={(e) => setIntervalCount(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </Field>
          ) : null}

          <Field label={t("startDate")} htmlFor="sub-start-date" required>
            <Input
              id="sub-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </Field>

          <Field label={t("nextRunDate")} htmlFor="sub-next-run" required>
            <Input
              id="sub-next-run"
              type="date"
              value={nextRunDate}
              onChange={(e) => setNextRunDate(e.target.value)}
              required
            />
          </Field>

          <Field label={t("endDate")} htmlFor="sub-end-date">
            <Input
              id="sub-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>

          <Field label={tc("currency")} htmlFor="sub-currency" required>
            <Select
              id="sub-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} - {isAr ? c.nameAr : c.nameEn}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* 3. Items & Pricing (Easily change services or raise prices) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <span>{t("items")}</span>
          </CardTitle>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddItem}
            className="gap-1.5 text-xs"
          >
            <Plus size={14} />
            <span>{t("addItem")}</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col md:flex-row items-start md:items-center gap-3 p-3 rounded-lg border border-border/70 bg-card/40"
              >
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input
                    value={item.descriptionAr}
                    onChange={(e) => handleItemChange(idx, "descriptionAr", e.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                    dir="rtl"
                    className="text-xs"
                    required
                  />
                  <Input
                    value={item.descriptionEn}
                    onChange={(e) => handleItemChange(idx, "descriptionEn", e.target.value)}
                    placeholder="Description in English (Optional)"
                    dir="ltr"
                    className="text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                  <div className="w-20">
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder={t("quantity")}
                      className="text-xs text-center"
                      title={t("quantity")}
                      required
                    />
                  </div>

                  <div className="w-32">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPriceStr}
                      onChange={(e) => handleItemChange(idx, "unitPriceStr", e.target.value)}
                      placeholder={t("unitPrice")}
                      dir="ltr"
                      className="text-xs font-mono text-center font-semibold"
                      title={t("unitPrice")}
                      required
                    />
                  </div>

                  {items.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                      title={tc("delete")}
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Totals Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-border/60">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 font-medium">
                <span>{t("taxRate")}:</span>
                <Select
                  value={taxRateBp}
                  onChange={(e) => setTaxRateBp(Number(e.target.value))}
                  className="w-28 text-xs py-1"
                >
                  <option value={1500}>15% (VAT)</option>
                  <option value={500}>5%</option>
                  <option value={0}>0%</option>
                </Select>
              </label>

              <label className="flex items-center gap-2 font-medium">
                <span>{t("discount")}:</span>
                <Select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                  className="w-28 text-xs py-1"
                >
                  <option value="none">{tc("no")}</option>
                  <option value="percent">% نسبة</option>
                  <option value="fixed">مبلغ ثابت</option>
                </Select>
                {discountType !== "none" ? (
                  <Input
                    type="number"
                    min={0}
                    value={discountType === "percent" ? discountValue / 100 : discountValue / 100}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setDiscountValue(Math.round(val * 100));
                    }}
                    className="w-24 text-xs font-mono"
                    dir="ltr"
                  />
                ) : null}
              </label>
            </div>

            {/* Calculations Box */}
            <div className="flex flex-col items-end gap-1 text-xs bg-muted/20 p-3 rounded-lg border border-border/60 min-w-[220px]">
              <div className="flex justify-between w-full text-muted-foreground">
                <span>{t("subtotal")}:</span>
                <span dir="ltr" className="font-mono font-medium">
                  {formatMoney(subtotalMinor, currency as CurrencyCode, locale)}
                </span>
              </div>
              {discountMinor > 0 ? (
                <div className="flex justify-between w-full text-amber-500">
                  <span>{t("discount")}:</span>
                  <span dir="ltr" className="font-mono font-medium">
                    -{formatMoney(discountMinor, currency as CurrencyCode, locale)}
                  </span>
                </div>
              ) : null}
              {taxMinor > 0 ? (
                <div className="flex justify-between w-full text-muted-foreground">
                  <span>{t("tax")} ({taxRateBp / 100}%):</span>
                  <span dir="ltr" className="font-mono font-medium">
                    {formatMoney(taxMinor, currency as CurrencyCode, locale)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between w-full pt-1.5 border-t border-border/80 font-bold text-sm text-foreground">
                <span>{t("total")}:</span>
                <span dir="ltr" className="font-mono text-primary font-bold">
                  {formatMoney(totalMinor, currency as CurrencyCode, locale)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Payment Methods & Billing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">
            {t("settingsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PaymentMethodsSelector
            accounts={bankAccounts}
            selectedIds={selectedAccountIds}
            onChange={setSelectedAccountIds}
            disabled={pending}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Field label={t("paymentTermsDays")} htmlFor="sub-terms">
              <Input
                id="sub-terms"
                type="number"
                min={0}
                max={365}
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </Field>

            <label className="flex h-11 cursor-pointer items-center justify-between rounded-lg border border-border/80 bg-muted/20 px-3.5 text-xs text-foreground transition-colors hover:bg-muted/30 select-none sm:col-span-1 mt-6">
              <span className="font-medium">{t("autoIssue")}</span>
              <Checkbox
                checked={autoIssueInvoice}
                onChange={(e) => setAutoIssueInvoice(e.target.checked)}
                sx={{ p: 0.5 }}
              />
            </label>

            <label className="flex h-11 cursor-pointer items-center justify-between rounded-lg border border-border/80 bg-muted/20 px-3.5 text-xs text-foreground transition-colors hover:bg-muted/30 select-none sm:col-span-1 mt-6">
              <span className="font-medium">{t("autoSendEmail")}</span>
              <Checkbox
                checked={autoSendEmail}
                onChange={(e) => setAutoSendEmail(e.target.checked)}
                sx={{ p: 0.5 }}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 5. Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">
            {t("notes")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t("notesAr")} htmlFor="sub-notes-ar">
            <Textarea
              id="sub-notes-ar"
              value={notesAr}
              onChange={(e) => setNotesAr(e.target.value)}
              placeholder={isAr ? "شروط الخدمة والاتفاقية الخاصة بالاشتراك..." : "Service terms in Arabic..."}
              rows={3}
              dir="rtl"
            />
          </Field>

          <Field label={t("notesEn")} htmlFor="sub-notes-en">
            <Textarea
              id="sub-notes-en"
              value={notesEn}
              onChange={(e) => setNotesEn(e.target.value)}
              placeholder="Terms and conditions in English..."
              rows={3}
              dir="ltr"
            />
          </Field>
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pb-8">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={pending}
        >
          <X size={15} />
          <span>{tc("cancel")}</span>
        </Button>
        <Button
          type="submit"
          loading={pending}
          className="gap-2"
        >
          <Check size={15} />
          <span>{tc("save")}</span>
        </Button>
      </div>
    </form>
  );
}
