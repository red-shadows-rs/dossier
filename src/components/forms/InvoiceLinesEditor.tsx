"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { CURRENCIES, DISCOUNT_TYPES, type CurrencyCode } from "@/lib/constants";
import { formatMoney, parseMajorToMinor } from "@/lib/money";
import {
  previewInvoiceTotalsAction,
  saveInvoiceLinesAction,
} from "@/server/actions/invoices";
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
};

function toRows(items: BuilderItem[], currency: string): Row[] {
  const exp = CURRENCIES[currency as CurrencyCode] ?? 2;
  const factor = 10 ** exp;
  return items.map((item) => ({
    descriptionAr: item.descriptionAr,
    descriptionEn: item.descriptionEn,
    qty: String(item.qtyMilli / 1000),
    unit: String(item.unitPriceMinor / factor),
  }));
}

function parseSafe(value: string, currency: string): number | null {
  try {
    return parseMajorToMinor(value, currency as CurrencyCode);
  } catch {
    return null;
  }
}

export function InvoiceLinesEditor({
  id,
  currency,
  initialLines,
  initialDiscount,
  initialTaxRateBp,
}: {
  id: string;
  currency: string;
  initialLines: BuilderItem[];
  initialDiscount: { type: "none" | "percent" | "fixed"; value: number };
  initialTaxRateBp: number;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const currencyCode = currency as CurrencyCode;
  const factor = 10 ** (CURRENCIES[currencyCode] ?? 2);
  const [rows, setRows] = useState<Row[]>(() =>
    initialLines.length > 0
      ? toRows(initialLines, currency)
      : [{ descriptionAr: "", descriptionEn: "", qty: "1", unit: "" }],
  );
  const [discountType, setDiscountType] = useState(initialDiscount.type);
  const [discountValue, setDiscountValue] = useState(
    initialDiscount.type === "percent"
      ? String(initialDiscount.value / 100)
      : initialDiscount.type === "fixed"
        ? String(initialDiscount.value / factor)
        : "0",
  );
  const [taxPercent, setTaxPercent] = useState(String(initialTaxRateBp / 100));
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const payload = useMemo(() => {
    const lines: {
      descriptionAr: string;
      descriptionEn: string;
      qtyMilli: number;
      unitPriceMinor: number;
    }[] = [];
    for (const row of rows) {
      const qty = Number(row.qty);
      const unit = row.unit.trim() === "" ? 0 : parseSafe(row.unit, currency);
      if (unit === null || !Number.isFinite(qty) || qty <= 0) return null;
      lines.push({
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
          ? parseSafe(discountValue, currency)
          : 0;
    if (dv === null) return null;
    return {
      lines,
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
      const result = await previewInvoiceTotalsAction(payload);
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payload) {
      toast({ title: t("errors.VALIDATION_FAILED"), tone: "error" });
      return;
    }
    setPending(true);
    const result = await saveInvoiceLinesAction({ id, ...payload });
    setPending(false);
    if (result.ok) {
      toast({ title: t("invoices.saved"), tone: "success" });
      router.refresh();
      return;
    }
    setError(result.error.fieldErrors?.discountValue ?? null);
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  const money = (minor: number) => formatMoney(minor, currencyCode, "en");

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("invoices.linesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 md:grid-cols-12"
            >
              <Field
                label={t("contracts.item.descriptionAr")}
                htmlFor={`iline-ar-${index}`}
                className="md:col-span-4"
              >
                <Input
                  id={`iline-ar-${index}`}
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
                htmlFor={`iline-en-${index}`}
                className="md:col-span-4"
              >
                <Input
                  id={`iline-en-${index}`}
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
                htmlFor={`iline-qty-${index}`}
                className="md:col-span-1"
              >
                <Input
                  id={`iline-qty-${index}`}
                  dir="ltr"
                  value={row.qty}
                  onChange={(event) =>
                    updateRow(index, { qty: event.target.value })
                  }
                  className="text-start"
                />
              </Field>
              <Field
                label={t("contracts.item.unit")}
                htmlFor={`iline-unit-${index}`}
                className="md:col-span-2"
              >
                <Input
                  id={`iline-unit-${index}`}
                  dir="ltr"
                  value={row.unit}
                  onChange={(event) =>
                    updateRow(index, { unit: event.target.value })
                  }
                  className="text-start"
                />
              </Field>
              <div className="flex items-end justify-center pb-0.5 md:col-span-1">
                <Tooltip content={t("common.delete")}>
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
                    aria-label={t("common.delete")}
                    className="flex h-9 w-9 items-center justify-center rounded border border-border/70 bg-card text-muted-foreground hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}

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
            <span>{t("invoices.addLine")}</span>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("contracts.builder.totalsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label={t("contracts.discountType")} htmlFor="inv-disc-type">
            <Select
              id="inv-disc-type"
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
            htmlFor="inv-disc-value"
            error={error ? t(error) : null}
          >
            <Input
              id="inv-disc-value"
              dir="ltr"
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
              disabled={discountType === "none"}
              className="text-start"
            />
          </Field>
          <Field label={t("contracts.taxRate")} htmlFor="inv-tax">
            <Input
              id="inv-tax"
              dir="ltr"
              value={taxPercent}
              onChange={(event) => setTaxPercent(event.target.value)}
              className="text-start"
            />
          </Field>

          <dl className="flex flex-col gap-1 md:col-span-3">
            {totals ? (
              <>
                <Line
                  label={t("common.subtotal")}
                  value={money(totals.subtotal)}
                />
                <Line
                  label={t("contracts.discountLabel")}
                  value={money(totals.discount)}
                />
                <Line label={t("contracts.net")} value={money(totals.net)} />
                <Line label={t("contracts.tax")} value={money(totals.tax)} />
                <Line
                  label={t("common.total")}
                  value={money(totals.total)}
                  strong
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("contracts.builder.totalsHint")}
              </p>
            )}
          </dl>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={pending} className="gap-2">
          <Save className="h-4 w-4" />
          <span>{t("common.save")}</span>
        </Button>
      </div>
    </form>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          strong ? "font-semibold text-foreground tabular-nums" : "tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}
