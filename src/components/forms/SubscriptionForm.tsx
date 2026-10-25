// Dossier - Subscription Form Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Tooltip } from "@/components/ui/Tooltip";
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

type StepId = "basics" | "schedule" | "pricing" | "settings";

interface StepConfig {
  id: StepId;
  labelKey: string;
  icon: typeof CalendarClock;
}

const STEPS: readonly StepConfig[] = [
  { id: "basics", labelKey: "subscriptions.formSteps.basics", icon: CalendarClock },
  { id: "schedule", labelKey: "subscriptions.formSteps.schedule", icon: RefreshCw },
  { id: "pricing", labelKey: "subscriptions.formSteps.pricing", icon: Receipt },
  { id: "settings", labelKey: "subscriptions.formSteps.settings", icon: Settings },
];

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
  const tInvoices = useTranslations("invoices");
  const tContracts = useTranslations("contracts");
  const rawLocale = useLocale();
  const locale: "ar" | "en" = rawLocale === "en" ? "en" : "ar";
  const isAr = locale === "ar";
  const toast = useToast();
  const router = useRouter();

  const isEdit = Boolean(initialData?.id);
  const [step, setStep] = useState<StepId>("basics");
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

  const currentIndex = STEPS.findIndex((s) => s.id === step);

  function goNext() {
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!titleAr.trim()) {
      setStep("basics");
      toast({ title: isAr ? "يرجى إدخال عنوان الاشتراك" : "Please enter a subscription title", tone: "error" });
      return;
    }

    if (!clientId) {
      setStep("basics");
      toast({ title: isAr ? "يرجى اختيار العميل" : "Please select a client", tone: "error" });
      return;
    }

    const validItems: SubscriptionItemInput[] = [];
    for (const item of items) {
      if (!item.descriptionAr.trim()) {
        setStep("pricing");
        toast({
          title: isAr ? "يرجى إدخال وصف البنود" : "Please enter item descriptions",
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
      setStep("pricing");
      toast({ title: isAr ? "يجب إضافة بند واحد على الأقل" : "At least one item is required", tone: "error" });
      return;
    }

    if (bankAccounts.length > 0 && selectedAccountIds.length === 0) {
      setStep("settings");
      toast({
        title: isAr ? "اختر طريقة دفع واحدة على الأقل" : "Please select at least one payment method",
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
        if (res.error.fieldErrors) {
          const keys = Object.keys(res.error.fieldErrors);
          if (keys.some((k) => k === "titleAr" || k === "titleEn" || k === "clientId" || k === "projectId" || k === "description")) {
            setStep("basics");
          } else if (keys.some((k) => k === "frequency" || k === "intervalCount" || k === "startDate" || k === "nextRunDate" || k === "endDate" || k === "currency")) {
            setStep("schedule");
          } else if (keys.some((k) => k.startsWith("items") || k === "taxRateBp" || k.startsWith("discount"))) {
            setStep("pricing");
          } else if (keys.some((k) => k === "bankAccountIds" || k.startsWith("notes") || k.startsWith("auto") || k === "paymentTermsDays")) {
            setStep("settings");
          }
        }
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
        if (res.error.fieldErrors) {
          const keys = Object.keys(res.error.fieldErrors);
          if (keys.some((k) => k === "titleAr" || k === "titleEn" || k === "clientId" || k === "projectId" || k === "description")) {
            setStep("basics");
          } else if (keys.some((k) => k === "frequency" || k === "intervalCount" || k === "startDate" || k === "nextRunDate" || k === "endDate" || k === "currency")) {
            setStep("schedule");
          } else if (keys.some((k) => k.startsWith("items") || k === "taxRateBp" || k.startsWith("discount"))) {
            setStep("pricing");
          } else if (keys.some((k) => k === "bankAccountIds" || k.startsWith("notes") || k.startsWith("auto") || k === "paymentTermsDays")) {
            setStep("settings");
          }
        }
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 pb-28">
      <div className="relative sm:sticky sm:top-14 z-20 rounded border border-border bg-card p-1 shadow-xs">
        <nav
          aria-label={t("formSteps.basics")}
          className="flex items-center gap-1 overflow-x-auto touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-1.5"
        >
          {STEPS.map((s, index) => {
            const active = step === s.id;
            const completed = index < currentIndex;
            const Icon = s.icon;

            return (
              <button
                key={s.id}
                id={`subscription-step-btn-${s.id}`}
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => {
                  setStep(s.id);
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
                  {t(`formSteps.${s.id}`)}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {step === "basics" && (
        <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
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
                  placeholder={t("placeholders.titleAr")}
                  dir="rtl"
                  required
                />
              </Field>

              <Field label={`${t("subscriptionTitle")} (En)`} htmlFor="sub-title-en">
                <Input
                  id="sub-title-en"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder={t("placeholders.titleEn")}
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
                    placeholder={t("placeholders.description")}
                    rows={2}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "schedule" && (
        <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <RefreshCw size={16} className="text-primary" />
                <span>{t("frequency")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
            </CardContent>
          </Card>
        </div>
      )}

      {step === "pricing" && (
        <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Receipt size={16} className="text-primary" />
                <span>{t("items")}</span>
              </CardTitle>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddItem}
                className="gap-1.5 text-xs shadow-2xs font-medium"
              >
                <Plus size={14} />
                <span>{t("addItem")}</span>
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 md:grid-cols-12"
                >
                  <Field
                    label={tContracts("item.descriptionAr")}
                    htmlFor={`sub-item-ar-${idx}`}
                    className="md:col-span-4"
                    required
                  >
                    <Input
                      id={`sub-item-ar-${idx}`}
                      dir="rtl"
                      lang="ar"
                      value={item.descriptionAr}
                      onChange={(e) => handleItemChange(idx, "descriptionAr", e.target.value)}
                      placeholder={tInvoices("placeholders.lineDescriptionAr")}
                      className="text-start"
                      required
                    />
                  </Field>

                  <Field
                    label={tContracts("item.descriptionEn")}
                    htmlFor={`sub-item-en-${idx}`}
                    className="md:col-span-4"
                  >
                    <Input
                      id={`sub-item-en-${idx}`}
                      dir="ltr"
                      lang="en"
                      value={item.descriptionEn}
                      onChange={(e) => handleItemChange(idx, "descriptionEn", e.target.value)}
                      placeholder={tInvoices("placeholders.lineDescriptionEn")}
                      className="text-start"
                    />
                  </Field>

                  <Field
                    label={t("quantity")}
                    htmlFor={`sub-item-qty-${idx}`}
                    className="md:col-span-1"
                    required
                  >
                    <Input
                      id={`sub-item-qty-${idx}`}
                      dir="ltr"
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder={tInvoices("placeholders.lineQty")}
                      className="text-start"
                      required
                    />
                  </Field>

                  <Field
                    label={t("unitPrice")}
                    htmlFor={`sub-item-unit-${idx}`}
                    className="md:col-span-2"
                    required
                  >
                    <Input
                      id={`sub-item-unit-${idx}`}
                      dir="ltr"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPriceStr}
                      onChange={(e) => handleItemChange(idx, "unitPriceStr", e.target.value)}
                      placeholder="0.00"
                      className="text-start font-mono font-medium"
                      required
                    />
                  </Field>

                  <div className="flex items-end justify-center pb-0.5 md:col-span-1">
                    <Tooltip content={tc("delete")}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        aria-label={tc("delete")}
                        className="flex h-9 w-9 shrink-0 aspect-square items-center justify-center rounded border border-border/70 bg-card text-muted-foreground hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Receipt size={16} className="text-primary" />
                <span>{tContracts("builder.totalsTitle")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label={tContracts("discountType")} htmlFor="sub-disc-type">
                <Select
                  id="sub-disc-type"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                >
                  <option value="none">{tc("no")}</option>
                  <option value="percent">{tContracts("discount.percent")}</option>
                  <option value="fixed">{tContracts("discount.fixed")}</option>
                </Select>
              </Field>

              <Field label={tContracts("discountValue")} htmlFor="sub-disc-val">
                <Input
                  id="sub-disc-val"
                  type="number"
                  min={0}
                  step={discountType === "percent" ? "0.01" : "1"}
                  value={discountType === "percent" ? discountValue / 100 : discountValue / 100}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setDiscountValue(Math.round(val * 100));
                  }}
                  disabled={discountType === "none"}
                  placeholder={tInvoices("placeholders.discount")}
                  dir="ltr"
                  className="text-start font-mono"
                />
              </Field>

              <Field label={t("taxRate")} htmlFor="sub-tax-rate">
                <Select
                  id="sub-tax-rate"
                  value={taxRateBp}
                  onChange={(e) => setTaxRateBp(Number(e.target.value))}
                >
                  <option value={1500}>15% (VAT)</option>
                  <option value={500}>5%</option>
                  <option value={0}>0%</option>
                </Select>
              </Field>

              <dl className="flex flex-col gap-1.5 md:col-span-3 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <dt className="text-muted-foreground">{t("subtotal")}</dt>
                  <dd dir="ltr" className="tabular-nums font-mono">
                    {formatMoney(subtotalMinor, currency as CurrencyCode, locale)}
                  </dd>
                </div>

                {discountMinor > 0 ? (
                  <div className="flex items-center justify-between gap-4 text-sm text-amber-500">
                    <dt>{t("discount")}</dt>
                    <dd dir="ltr" className="tabular-nums font-mono font-medium">
                      -{formatMoney(discountMinor, currency as CurrencyCode, locale)}
                    </dd>
                  </div>
                ) : null}

                {taxMinor > 0 ? (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-muted-foreground">{t("tax")} ({taxRateBp / 100}%)</dt>
                    <dd dir="ltr" className="tabular-nums font-mono">
                      {formatMoney(taxMinor, currency as CurrencyCode, locale)}
                    </dd>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-4 text-sm pt-2 border-t border-border/80">
                  <dt className="font-semibold text-foreground">{t("total")}</dt>
                  <dd dir="ltr" className="font-bold text-primary font-mono text-base tabular-nums">
                    {formatMoney(totalMinor, currency as CurrencyCode, locale)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "settings" && (
        <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard size={16} className="text-primary" />
                <span>{t("settingsTitle")}</span>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                <span>{t("notes")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={t("notesAr")} htmlFor="sub-notes-ar">
                <Textarea
                  id="sub-notes-ar"
                  value={notesAr}
                  onChange={(e) => setNotesAr(e.target.value)}
                  placeholder={t("placeholders.notesAr")}
                  rows={3}
                  dir="rtl"
                />
              </Field>

              <Field label={t("notesEn")} htmlFor="sub-notes-en">
                <Textarea
                  id="sub-notes-en"
                  value={notesEn}
                  onChange={(e) => setNotesEn(e.target.value)}
                  placeholder={t("placeholders.notesEn")}
                  rows={3}
                  dir="ltr"
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
              <span>{tc("previous")}</span>
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
              <span>{tc("next")}</span>
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
            <span>{tc("cancel")}</span>
          </Button>

          <Button
            type="submit"
            loading={pending}
            className="gap-2 px-5 font-medium text-xs sm:text-sm shadow-xs"
          >
            <Save className="h-4 w-4" />
            <span>{tc("save")}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
