// Dossier - Dashboard Currency Converter Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Coins,
} from "lucide-react";
import {
  CURRENCIES,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type Locale,
} from "@/lib/constants";
import { convertCurrency, getDirectRate } from "@/lib/currency";
import { formatMoney } from "@/lib/money";

interface CurrencyConverterWidgetProps {
  defaultCurrency: CurrencyCode;
  rates: Record<string, number>;
  locale: Locale;
  updatedAt?: number;
}

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

export function CurrencyConverterWidget({
  defaultCurrency,
  rates,
  locale,
  updatedAt: _updatedAt,
}: CurrencyConverterWidgetProps) {
  const t = useTranslations("dashboard");
  const inputId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [amountStr, setAmountStr] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>(
    defaultCurrency === "USD" ? "EUR" : "USD",
  );
  const [toCurrency, setToCurrency] = useState<CurrencyCode>(defaultCurrency);

  const numericAmount = useMemo(() => {
    const clean = amountStr.replace(/[^0-9.]/g, "");
    const val = parseFloat(clean);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [amountStr]);

  const fromExp = CURRENCIES[fromCurrency] ?? 2;
  const toExp = CURRENCIES[toCurrency] ?? 2;

  const convertedMajor = useMemo(() => {
    if (numericAmount === 0) return 0;
    const amountMinor = Math.round(numericAmount * Math.pow(10, fromExp));
    const convertedMinor = convertCurrency(
      amountMinor,
      fromCurrency,
      toCurrency,
      rates,
    );
    return convertedMinor / Math.pow(10, toExp);
  }, [numericAmount, fromCurrency, toCurrency, rates, fromExp, toExp]);

  const directRate = useMemo(() => {
    return getDirectRate(fromCurrency, toCurrency, rates);
  }, [fromCurrency, toCurrency, rates]);

  const inverseRate = useMemo(() => {
    return getDirectRate(toCurrency, fromCurrency, rates);
  }, [fromCurrency, toCurrency, rates]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const formattedResult = useMemo(() => {
    const minor = Math.round(convertedMajor * Math.pow(10, toExp));
    return formatMoney(minor, toCurrency, locale);
  }, [convertedMajor, toCurrency, locale, toExp]);

  const baseRatePill = useMemo(() => {
    const pairCurrency = defaultCurrency === "USD" ? "EUR" : "USD";
    const rate = getDirectRate(pairCurrency, defaultCurrency, rates);
    return `1 ${pairCurrency} = ${rate.toFixed(4)} ${defaultCurrency}`;
  }, [defaultCurrency, rates]);

  return (
    <div className="rounded-lg border border-border/80 bg-card p-3 sm:p-4 shadow-2xs transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-start font-semibold text-sm text-foreground hover:text-primary transition-colors focus:outline-hidden"
          aria-expanded={isOpen}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
            <Coins size={14} aria-hidden="true" />
          </span>
          <span className="truncate">{t("currencyConverter")}</span>
          {isOpen ? (
            <ChevronUp size={15} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={15} className="text-muted-foreground" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span dir="ltr">{baseRatePill}</span>
          </span>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs font-medium text-primary hover:underline px-1 py-0.5"
          >
            {isOpen ? (locale === "ar" ? "إغلاق" : "Close") : (locale === "ar" ? "تحويل عملات" : "Convert")}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-3.5 pt-3.5 border-t border-border/50 flex flex-col gap-3.5 animate-in fade-in-50 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div className="sm:col-span-4 flex flex-col gap-1.5">
              <label
                htmlFor={inputId}
                className="text-xs font-medium text-muted-foreground"
              >
                {t("amountLabel")}
              </label>
              <input
                id={inputId}
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="h-9 w-full rounded border border-input bg-background px-3 font-mono text-sm text-foreground tabular-nums placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="sm:col-span-3 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("fromCurrency")}
              </span>
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value as CurrencyCode)}
                className="h-9 w-full rounded border border-input bg-background px-2.5 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({locale === "ar" ? c.nameAr : c.nameEn})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1 flex justify-center pb-0.5">
              <button
                type="button"
                onClick={handleSwap}
                title={t("swap")}
                className="flex h-9 w-9 items-center justify-center rounded border border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <ArrowLeftRight size={15} aria-hidden="true" />
              </button>
            </div>

            <div className="sm:col-span-4 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("toCurrency")}
              </span>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value as CurrencyCode)}
                className="h-9 w-full rounded border border-input bg-background px-2.5 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({locale === "ar" ? c.nameAr : c.nameEn})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-primary/20 bg-primary/5 p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {locale === "ar" ? "النتيجة المحولة" : "Converted result"}
              </span>
              <span className="font-mono text-lg sm:text-xl font-bold tracking-tight text-primary tabular-nums">
                {formattedResult}
              </span>
            </div>

            <div className="flex flex-col items-end gap-0.5 text-end font-mono text-[11px] text-muted-foreground">
              <span dir="ltr">1 {fromCurrency} = {directRate.toFixed(4)} {toCurrency}</span>
              <span dir="ltr" className="opacity-75">1 {toCurrency} = {inverseRate.toFixed(4)} {fromCurrency}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium">{locale === "ar" ? "أرقام سريعة:" : "Quick amounts:"}</span>
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountStr(String(val))}
                  className="rounded border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[11px] hover:border-primary/50 hover:bg-primary/10 transition-colors"
                >
                  {val.toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}
                </button>
              ))}
            </div>

            <span className="text-[10px] text-muted-foreground opacity-80">
              {t("liveRatesBadge")}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
