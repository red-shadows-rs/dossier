// Dossier - Dashboard Filter Dashboard Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Check,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
  { key: "custom", ar: "مخصص...", en: "Custom..." },
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

  const [open, setOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DashboardRange>(currentRange);
  const [customFrom, setCustomFrom] = useState<string>(from ?? "");
  const [customTo, setCustomTo] = useState<string>(to ?? "");
  const containerRef = useRef<HTMLDivElement>(null);

  const isFiltered = currentRange !== "this_month";
  const activeItem = RANGES.find((r) => r.key === currentRange);
  const activeLabel = activeItem ? (ar ? activeItem.ar : activeItem.en) : "";

  useEffect(() => {
    setSelectedRange(currentRange);
    setCustomFrom(from ?? "");
    setCustomTo(to ?? "");
  }, [currentRange, from, to]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Element | null;
      if (!target) return;
      if (containerRef.current?.contains(target)) return;
      if (
        target.closest?.(
          ".MuiPopover-root, .MuiMenu-root, .MuiModal-root, .MuiBackdrop-root, [role='dialog']",
        )
      ) {
        return;
      }
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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
      setOpen(false);
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
    setOpen(false);
    router.push(`/?${params.toString()}`);
  };

  const handleReset = () => {
    setSelectedRange("this_month");
    setCustomFrom("");
    setCustomTo("");
    setOpen(false);
    router.push("/");
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        type="button"
        variant={isFiltered ? "secondary" : "outline"}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-10 px-3.5 gap-2 border-border/80 transition-colors cursor-pointer",
          isFiltered
            ? "border-primary/50 text-primary font-medium bg-primary/10 hover:bg-primary/15"
            : "text-foreground bg-card hover:bg-muted/60",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
        <span>{ar ? "تصفية" : "Filter"}</span>
        {isFiltered ? (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
            {activeLabel}
          </span>
        ) : null}
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </Button>

      <div
        className={cn(
          "absolute end-0 top-full mt-2 w-[min(calc(100vw-2rem),340px)] rounded-xl border border-border/80 bg-card/95 p-4 shadow-xl backdrop-blur-md z-50 flex flex-col gap-3.5",
          open ? "block animate-in fade-in-50 zoom-in-95" : "hidden",
        )}
        role="dialog"
        aria-label={ar ? "خيارات تصفية الفترة" : "Filter Period Options"}
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
              <SlidersHorizontal size={14} aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              {ar ? "فترة التقرير" : "Report Period"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={ar ? "إغلاق" : "Close"}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {RANGES.map((item) => {
            const active = selectedRange === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelectRange(item.key)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-start",
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted/60",
                )}
              >
                <span>{ar ? item.ar : item.en}</span>
                {active ? (
                  <Check size={14} className="text-primary shrink-0 stroke-[2.5]" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>

        {selectedRange === "custom" ? (
          <form
            onSubmit={handleApplyCustom}
            className="flex flex-col gap-2.5 pt-3 border-t border-border/50 animate-in fade-in-0 duration-150"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                {ar ? "من تاريخ" : "From date"}
              </span>
              <DatePicker
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1">
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
              className="h-8 gap-1.5 text-xs font-semibold mt-1 cursor-pointer"
            >
              <Calendar size={13} aria-hidden="true" />
              <span>{ar ? "تطبيق الفلترة" : "Apply Filter"}</span>
            </Button>
          </form>
        ) : null}

        <div className="flex items-center justify-between border-t border-border/40 pt-2.5 gap-2">
          {isFiltered ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw size={12} aria-hidden="true" />
              <span>{ar ? "إعادة تعيين" : "Reset"}</span>
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-7 px-3 text-xs cursor-pointer"
          >
            <span>{ar ? "إغلاق" : "Close"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
