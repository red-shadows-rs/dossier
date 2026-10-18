"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Filter, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn } from "@/components/ui/cn";
import type { DashboardRange } from "@/server/services/dashboard";
import type { Locale } from "@/lib/constants";

const RANGES: { key: DashboardRange; ar: string; en: string }[] = [
  { key: "this_month", ar: "هذا الشهر", en: "This Month" },
  { key: "today", ar: "اليوم", en: "Today" },
  { key: "7d", ar: "آخر 7 أيام", en: "Last 7 Days" },
  { key: "30d", ar: "آخر 30 يوماً", en: "Last 30 Days" },
  { key: "last_month", ar: "الشهر السابق", en: "Last Month" },
  { key: "this_year", ar: "هذا العام", en: "This Year" },
  { key: "all", ar: "كافة الفترات", en: "All Time" },
  { key: "custom", ar: "مخصص", en: "Custom" },
];

export function DashboardFilter({
  currentRange,
  from,
  to,
  locale,
}: {
  currentRange: DashboardRange;
  from?: string;
  to?: string;
  locale: Locale;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ar = locale === "ar";

  const [selectedRange, setSelectedRange] = useState<DashboardRange>(currentRange);
  const [customFrom, setCustomFrom] = useState<string>(from ?? "");
  const [customTo, setCustomTo] = useState<string>(to ?? "");

  const handleSelectRange = (range: DashboardRange) => {
    setSelectedRange(range);
    if (range !== "custom") {
      const params = new URLSearchParams(searchParams.toString());
      if (range === "this_month") {
        params.delete("range");
      } else {
        params.set("range", range);
      }
      params.delete("from");
      params.delete("to");
      const qs = params.toString();
      router.push(qs ? `/?${qs}` : "/");
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    if (customFrom) params.set("from", customFrom);
    else params.delete("from");
    if (customTo) params.set("to", customTo);
    else params.delete("to");
    router.push(`/?${params.toString()}`);
  };

  const handleReset = () => {
    setSelectedRange("this_month");
    setCustomFrom("");
    setCustomTo("");
    router.push("/");
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-3 shadow-2xs backdrop-blur-xs">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Filter size={14} className="text-primary shrink-0" aria-hidden="true" />
          <span>{ar ? "فترة التقرير والبيانات:" : "Period & Filter:"}</span>
        </div>

        {currentRange !== "this_month" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
          >
            <RotateCcw size={12} aria-hidden="true" />
            <span>{ar ? "استعادة الافتراضي" : "Reset filter"}</span>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5">
        {RANGES.map((item) => {
          const active = selectedRange === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleSelectRange(item.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                active
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40",
              )}
            >
              {active ? <Check size={12} className="shrink-0 stroke-[2.5]" aria-hidden="true" /> : null}
              <span>{ar ? item.ar : item.en}</span>
            </button>
          );
        })}
      </div>

      {selectedRange === "custom" ? (
        <form
          onSubmit={handleApplyCustom}
          className="flex flex-wrap items-end gap-3 pt-2 border-t border-border/50 animate-in fade-in-0 slide-in-from-top-1 duration-150"
        >
          <div className="flex flex-col gap-1 min-w-[140px] flex-1 sm:flex-initial">
            <span className="text-[11px] font-medium text-muted-foreground">
              {ar ? "من تاريخ" : "From date"}
            </span>
            <DatePicker
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="flex flex-col gap-1 min-w-[140px] flex-1 sm:flex-initial">
            <span className="text-[11px] font-medium text-muted-foreground">
              {ar ? "إلى تاريخ" : "To date"}
            </span>
            <DatePicker
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <Button
            type="submit"
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold px-4 cursor-pointer"
          >
            <Calendar size={13} aria-hidden="true" />
            <span>{ar ? "تطبيق الفلترة" : "Apply Filter"}</span>
          </Button>
        </form>
      ) : null}
    </div>
  );
}
