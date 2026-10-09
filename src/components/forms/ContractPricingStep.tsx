"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
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
}: {
  id: string;
  currency: string;
  initialItems: BuilderItem[];
  initialDiscount: { type: "none" | "percent" | "fixed"; value: number };
  initialTaxRateBp: number;
  onSaved: () => void;
}) {
  const t = useTranslations();
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      return;
    }
    setError(result.error.fieldErrors?.discountValue ?? null);
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  function money(minor: number): string {
    return formatMoney(minor, currencyCode, "en");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("contracts.builder.pricingTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 md:grid-cols-12"
              >
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
                    className="text-start"
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
                    className="text-start"
                  />
                </Field>
                <div className="flex items-end md:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setRows((current) =>
                        current.length > 1
                          ? current.filter((_, i) => i !== index)
                          : current,
                      )
                    }
                    disabled={rows.length <= 1}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() =>
              setRows((current) => [
                ...current,
                { descriptionAr: "", descriptionEn: "", qty: "1", unit: "" },
              ])
            }
          >
            {t("contracts.item.add")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("contracts.builder.totalsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              className="text-start"
            />
          </Field>
          <Field label={t("contracts.taxRate")} htmlFor="cb-tax">
            <Input
              id="cb-tax"
              dir="ltr"
              value={taxPercent}
              onChange={(event) => setTaxPercent(event.target.value)}
              className="text-start"
            />
          </Field>

          <dl className="flex flex-col gap-1 md:col-span-3" dir="ltr">
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
        <Button type="submit" loading={pending}>
          {t("common.save")}
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

function parseMajorToMinorSafe(value: string, currency: string): number | null {
  try {
    return parseMajorToMinor(value, currency as CurrencyCode);
  } catch {
    return null;
  }
}
