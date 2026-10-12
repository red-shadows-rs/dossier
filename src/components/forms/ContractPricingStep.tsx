// Dossier - Contract Pricing Step Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  Plus,
  Receipt,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { DISCOUNT_TYPES, type CurrencyCode } from "@/lib/constants";
import { formatMoney, parseMajorToMinor } from "@/lib/money";
import {
  previewTotalsAction,
  saveContractItemsAction,
} from "@/server/actions/contracts";
import type { BuilderItem } from "./ContractBuilder";

type Row = {
  descriptionAr: string;
  descriptionEn: string;
  qty: string;
  unit: string;
};

type Totals = {
  subtotal: number;
  discount: number;
  net: number;
  tax: number;
  total: number;
  lineTotals: number[];
};

function toRows(items: BuilderItem[]): Row[] {
  return items.map((item) => ({
    descriptionAr: item.descriptionAr,
    descriptionEn: item.descriptionEn,
    qty: String(item.qtyMilli / 1000),
    unit: String(item.unitPriceMinor / 100),
  }));
}

export function ContractPricingStep({
  id,
  currency,
  initialItems,
  initialDiscount,
  initialTaxRateBp,
  onSaved,
  onPrev,
  onNext,
}: {
  id: string;
  currency: string;
  initialItems: BuilderItem[];
  initialDiscount: { type: "none" | "percent" | "fixed"; value: number };
  initialTaxRateBp: number;
  onSaved: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>(() =>
    initialItems.length > 0
      ? toRows(initialItems)
      : [{ descriptionAr: "", descriptionEn: "", qty: "1", unit: "" }],
  );
  const [discountType, setDiscountType] = useState(initialDiscount.type);
  const [discountValue, setDiscountValue] = useState(
    initialDiscount.type === "percent"
      ? String(initialDiscount.value / 100)
      : initialDiscount.type === "fixed"
        ? String(initialDiscount.value / 100)
        : "0",
  );
  const [taxPercent, setTaxPercent] = useState(String(initialTaxRateBp / 100));
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currencyCode = currency as CurrencyCode;

  const payload = useMemo(() => {
    const items: {
      descriptionAr: string;
      descriptionEn: string;
      qtyMilli: number;
      unitPriceMinor: number;
    }[] = [];
    for (const row of rows) {
      const qty = Number(row.qty);
      const unit =
        row.unit.trim() === "" ? 0 : parseMajorToMinorSafe(row.unit, currency);
      if (unit === null || !Number.isFinite(qty) || qty <= 0) return null;
      items.push({
        descriptionAr: row.descriptionAr,
        descriptionEn: row.descriptionEn,
        qtyMilli: Math.round(qty * 1000),
        unitPriceMinor: unit,
      });
    }
    const dv =
      discountType === "percent"
        ? Math.round(Number(discountValue) * 100)
        : discountType === "fixed"
          ? parseMajorToMinorSafe(discountValue, currency)
          : 0;
    if (dv === null) return null;
    return {
      items,
      discount: { type: discountType, value: dv },
      taxRateBp: Math.round(Number(taxPercent) * 100),
    };
  }, [rows, discountType, discountValue, taxPercent, currency]);

  useEffect(() => {
    if (!payload) {
      setTotals(null);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const result = await previewTotalsAction(payload);
      if (result.ok) {
        setTotals(result.data);
        setError(null);
      } else {
        setTotals(null);
        setError(result.error.fieldErrors?.discountValue ?? null);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [payload]);

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function handleSave(advance: boolean = false) {
    if (!payload) {
      toast({ title: t("errors.VALIDATION_FAILED"), tone: "error" });
      return;
    }
    setPending(true);
    const result = await saveContractItemsAction({ id, ...payload });
    setPending(false);
    if (result.ok) {
      toast({ title: t("contracts.saved"), tone: "success" });
      onSaved();
      if (advance && onNext) {
        onNext();
      }
      return;
    }
    setError(result.error.fieldErrors?.discountValue ?? null);
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSave(false);
  }

  function money(minor: number): string {
    return formatMoney(minor, currencyCode, "en");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 pb-28">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="inline-flex items-center gap-2">
            <Receipt size={18} className="text-primary" aria-hidden="true" />
            <span>{t("contracts.builder.pricingTitle")}</span>
          </CardTitle>
          <span className="rounded border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
            {currency}
          </span>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {rows.map((row, index) => (
              <div
                key={index}
                className="group relative grid grid-cols-1 gap-3 rounded border border-border bg-card p-3 shadow-2xs md:grid-cols-12 md:items-end"
              >
                <div className="flex items-center justify-between md:hidden pb-1">
                  <span className="text-xs font-bold text-muted-foreground font-mono">
                    #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setRows((current) =>
                        current.length > 1
                          ? current.filter((_, i) => i !== index)
                          : current,
                      )
                    }
                    disabled={rows.length <= 1}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <Field
                  label={t("contracts.item.descriptionAr")}
                  htmlFor={`item-ar-${index}`}
                  className="md:col-span-4"
                >
                  <Input
                    id={`item-ar-${index}`}
                    dir="rtl"
                    lang="ar"
                    value={row.descriptionAr}
                    onChange={(event) =>
                      updateRow(index, { descriptionAr: event.target.value })
                    }
                    className="text-start"
                  />
                </Field>

                <Field
                  label={t("contracts.item.descriptionEn")}
                  htmlFor={`item-en-${index}`}
                  className="md:col-span-4"
                >
                  <Input
                    id={`item-en-${index}`}
                    dir="ltr"
                    lang="en"
                    value={row.descriptionEn}
                    onChange={(event) =>
                      updateRow(index, { descriptionEn: event.target.value })
                    }
                    className="text-start"
                  />
                </Field>

                <Field
                  label={t("contracts.item.qty")}
                  htmlFor={`item-qty-${index}`}
                  className="md:col-span-1"
                >
                  <Input
                    id={`item-qty-${index}`}
                    dir="ltr"
                    value={row.qty}
                    onChange={(event) =>
                      updateRow(index, { qty: event.target.value })
                    }
                    className="text-start font-mono"
                  />
                </Field>

                <Field
                  label={t("contracts.item.unit")}
                  htmlFor={`item-unit-${index}`}
                  className="md:col-span-2"
                >
                  <Input
                    id={`item-unit-${index}`}
                    dir="ltr"
                    value={row.unit}
                    onChange={(event) =>
                      updateRow(index, { unit: event.target.value })
                    }
                    className="text-start font-mono"
                  />
                </Field>

                <div className="hidden md:flex justify-center pb-0.5 md:col-span-1">
                  <Tooltip content={t("common.delete")}>
                    <button
                      type="button"
                      aria-label={t("common.delete")}
                      onClick={() =>
                        setRows((current) =>
                          current.length > 1
                            ? current.filter((_, i) => i !== index)
                            : current,
                        )
                      }
                      disabled={rows.length <= 1}
                      className="flex h-9 w-9 shrink-0 aspect-square items-center justify-center rounded border border-border/70 bg-card text-muted-foreground transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start gap-1.5"
            onClick={() =>
              setRows((current) => [
                ...current,
                { descriptionAr: "", descriptionEn: "", qty: "1", unit: "" },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            <span>{t("contracts.item.add")}</span>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="inline-flex items-center gap-2">
            <Calculator size={18} className="text-primary" aria-hidden="true" />
            <span>{t("contracts.builder.totalsTitle")}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
            <Field label={t("contracts.discountType")} htmlFor="cb-disc-type">
              <Select
                id="cb-disc-type"
                value={discountType}
                onChange={(event) =>
                  setDiscountType(
                    event.target.value as "none" | "percent" | "fixed",
                  )
                }
              >
                {DISCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`contracts.discount.${type}`)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={t("contracts.discountValue")}
              htmlFor="cb-disc-value"
              error={error ? t(error) : null}
            >
              <Input
                id="cb-disc-value"
                dir="ltr"
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
                disabled={discountType === "none"}
                className="text-start font-mono"
              />
            </Field>

            <Field label={t("contracts.taxRate")} htmlFor="cb-tax">
              <Input
                id="cb-tax"
                dir="ltr"
                value={taxPercent}
                onChange={(event) => setTaxPercent(event.target.value)}
                className="text-start font-mono"
              />
            </Field>
          </div>

          <div className="rounded border border-border bg-card/60 p-4 lg:col-span-5">
            {totals ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("common.subtotal")}</span>
                  <span className="font-mono font-medium text-foreground">
                    {money(totals.subtotal)}
                  </span>
                </div>

                {totals.discount > 0 ? (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("contracts.discountLabel")}</span>
                    <span className="font-mono font-medium text-destructive">
                      -{money(totals.discount)}
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("contracts.net")}</span>
                  <span className="font-mono font-medium text-foreground">
                    {money(totals.net)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {t("contracts.tax")} ({taxPercent}%)
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    {money(totals.tax)}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between rounded border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-bold text-foreground">
                  <span>{t("common.total")}</span>
                  <span className="text-base font-bold text-primary font-mono" dir="ltr">
                    {money(totals.total)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[100px] items-center justify-center text-center text-xs text-muted-foreground">
                {t("contracts.builder.totalsHint")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          {onPrev && (
            <Button
              type="button"
              variant="secondary"
              onClick={onPrev}
              disabled={pending}
              className="gap-1.5 text-xs sm:text-sm"
            >
              {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span>{t("common.previous")}</span>
            </Button>
          )}

          {onNext && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleSave(true)}
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

function parseMajorToMinorSafe(value: string, currency: string): number | null {
  try {
    return parseMajorToMinor(value, currency as CurrencyCode);
  } catch {
    return null;
  }
}
