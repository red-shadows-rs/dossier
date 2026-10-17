"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronDown, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/Button";

export function FilterDropdown({
  label,
  activeCount = 0,
  children,
  resetHref,
  title,
  applyLabel,
  resetLabel,
}: {
  label?: string;
  activeCount?: number;
  children: ReactNode;
  resetHref?: string;
  title?: string;
  applyLabel?: string;
  resetLabel?: string;
}) {
  const locale = useLocale();
  const isAr = locale !== "en";

  const resolvedLabel = label ?? (isAr ? "تصفية" : "Filter");
  const resolvedTitle = title ?? (isAr ? "خيارات التصفية" : "Filter Options");
  const resolvedApplyLabel = applyLabel ?? (isAr ? "تطبيق الفلاتر" : "Apply Filters");
  const resolvedResetLabel = resetLabel ?? (isAr ? "إعادة تعيين" : "Reset");

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Element | null;
      if (!target) return;

      if (containerRef.current?.contains(target)) {
        return;
      }

      if (
        target.closest?.(
          ".MuiPopover-root, .MuiMenu-root, .MuiModal-root, .MuiBackdrop-root, .MuiMenuItem-root, [role='listbox'], [role='menu']",
        )
      ) {
        return;
      }

      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        const isMuiMenuOpen = Boolean(
          document.querySelector(
            ".MuiPopover-root:not([aria-hidden='true']), .MuiMenu-root, .MuiModal-root",
          ),
        );
        if (isMuiMenuOpen) {
          return;
        }
        setOpen(false);
      }
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

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        type="button"
        variant={activeCount > 0 ? "secondary" : "outline"}
        onClick={() => setOpen((prev) => !prev)}
        className={`h-10 px-3.5 gap-2 border-border/80 transition-colors ${
          activeCount > 0
            ? "border-primary/50 text-primary font-medium bg-primary/10 hover:bg-primary/15"
            : "text-foreground bg-card hover:bg-muted/60"
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
        <span>{resolvedLabel}</span>
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground px-1.5">
            {activeCount}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </Button>

      <div
        className={`absolute end-0 top-full mt-2 w-[min(calc(100vw-2rem),360px)] rounded border border-border/80 bg-card/95 p-4 shadow-xl backdrop-blur-md z-50 flex flex-col gap-3.5 ${
          open ? "block animate-in fade-in-50 zoom-in-95" : "hidden"
        }`}
        role="dialog"
        aria-label={resolvedTitle}
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
              <SlidersHorizontal size={14} aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-foreground">{resolvedTitle}</span>
            {activeCount > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                {activeCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={isAr ? "إغلاق" : "Close"}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">{children}</div>

        <div className="flex items-center justify-between border-t border-border/40 pt-3 gap-2">
          {resetHref ? (
            <Link
              href={resetHref}
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground no-underline"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw size={13} aria-hidden="true" />
                <span>{resolvedResetLabel}</span>
              </Button>
            </Link>
          ) : (
            <div />
          )}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="px-4 gap-1.5 h-8 font-medium shadow-xs"
            onClick={() => setOpen(false)}
          >
            <Check size={14} aria-hidden="true" />
            <span>{resolvedApplyLabel}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
