"use client";

import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ChangeEvent,
  type InputHTMLAttributes,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/components/ui/cn";

export type DatePickerProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
> & {
  type?: string;
  className?: string;
  inputClassName?: string;
  min?: string | number;
  max?: string | number;
  clearable?: boolean;
};

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const ENGLISH_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ARABIC_WEEKDAYS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const ENGLISH_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseIso(str: string | null | undefined): {
  year: number;
  month: number;
  day: number;
} | null {
  if (!str) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function formatIso(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  function DatePicker(
    {
      id,
      name,
      value,
      defaultValue,
      onChange,
      disabled,
      placeholder,
      className,
      inputClassName,
      min,
      max,
      clearable = true,
      type: _type,
      ...props
    },
    forwardedRef,
  ) {
    let activeLocale = "ar";
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      activeLocale = useLocale();
    } catch {
      if (typeof document !== "undefined") {
        activeLocale = document.documentElement.lang || "ar";
      }
    }
    const isRtl = activeLocale === "ar";

    const isControlled = value !== undefined;
    const [internalVal, setInternalVal] = useState<string>(() => {
      if (value !== undefined) return String(value ?? "");
      if (defaultValue !== undefined) return String(defaultValue ?? "");
      return "";
    });

    const [open, setOpen] = useState(false);
    const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");

    const parsedVal = useMemo(() => parseIso(internalVal), [internalVal]);

    const todayIso = useMemo(() => getTodayIso(), []);
    const parsedToday = useMemo(() => {
      const p = parseIso(todayIso);
      if (p) return p;
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
    }, [todayIso]);

    const [browseYear, setBrowseYear] = useState<number>(
      () => parsedVal?.year ?? parsedToday.year,
    );
    const [browseMonth, setBrowseMonth] = useState<number>(
      () => parsedVal?.month ?? parsedToday.month,
    );

    useEffect(() => {
      if (isControlled) {
        const nextVal = String(value ?? "");
        setInternalVal(nextVal);
        const p = parseIso(nextVal);
        if (p) {
          setBrowseYear(p.year);
          setBrowseMonth(p.month);
        }
      }
    }, [isControlled, value]);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (!open) return;
      const handleClickOutside = (e: globalThis.MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node) &&
          popoverRef.current &&
          !popoverRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
          setViewMode("days");
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const notifyChange = useCallback(
      (newVal: string) => {
        if (!isControlled) {
          setInternalVal(newVal);
        }
        if (inputRef.current) {
          inputRef.current.value = newVal;
          const ev = new Event("change", { bubbles: true });
          inputRef.current.dispatchEvent(ev);
        }
        if (onChange) {
          const fakeEvent = {
            target: { value: newVal, name: name ?? "" },
            currentTarget: { value: newVal, name: name ?? "" },
          } as unknown as ChangeEvent<HTMLInputElement>;
          onChange(fakeEvent);
        }
      },
      [isControlled, name, onChange],
    );

    const handleSelectDay = (day: number) => {
      const formatted = formatIso(browseYear, browseMonth, day);
      notifyChange(formatted);
      setOpen(false);
      setViewMode("days");
    };

    const handleClear = (e: MouseEvent) => {
      e.stopPropagation();
      notifyChange("");
      setViewMode("days");
    };

    const handleSelectToday = () => {
      notifyChange(todayIso);
      setBrowseYear(parsedToday.year);
      setBrowseMonth(parsedToday.month);
      setOpen(false);
      setViewMode("days");
    };

    const handlePrevMonth = () => {
      if (browseMonth === 1) {
        setBrowseMonth(12);
        setBrowseYear((y) => y - 1);
      } else {
        setBrowseMonth((m) => m - 1);
      }
    };

    const handleNextMonth = () => {
      if (browseMonth === 12) {
        setBrowseMonth(1);
        setBrowseYear((y) => y + 1);
      } else {
        setBrowseMonth((m) => m + 1);
      }
    };

    const handlePrevYear = () => {
      setBrowseYear((y) => y - 1);
    };

    const handleNextYear = () => {
      setBrowseYear((y) => y + 1);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Escape") {
        setOpen(false);
        setViewMode("days");
      } else if (e.key === "ArrowDown" && !open) {
        setOpen(true);
      }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setInternalVal(raw);
      onChange?.(e);
      const parsed = parseIso(raw);
      if (parsed) {
        setBrowseYear(parsed.year);
        setBrowseMonth(parsed.month);
      }
    };

    const daysInCurrentMonth = getDaysInMonth(browseYear, browseMonth);
    const firstDayOfWeek = getFirstDayOfWeek(browseYear, browseMonth);

    const prevMonthDaysCount =
      browseMonth === 1
        ? getDaysInMonth(browseYear - 1, 12)
        : getDaysInMonth(browseYear, browseMonth - 1);

    const minStr = min !== undefined ? String(min) : undefined;
    const maxStr = max !== undefined ? String(max) : undefined;

    const daysList = useMemo(() => {
      const list: Array<{
        day: number;
        isCurrentMonth: boolean;
        isoStr: string;
        isDisabled: boolean;
        isSelected: boolean;
        isToday: boolean;
      }> = [];

      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const d = prevMonthDaysCount - i;
        const prevM = browseMonth === 1 ? 12 : browseMonth - 1;
        const prevY = browseMonth === 1 ? browseYear - 1 : browseYear;
        const iso = formatIso(prevY, prevM, d);
        list.push({
          day: d,
          isCurrentMonth: false,
          isoStr: iso,
          isDisabled: Boolean((minStr && iso < minStr) || (maxStr && iso > maxStr)),
          isSelected: internalVal === iso,
          isToday: todayIso === iso,
        });
      }

      for (let d = 1; d <= daysInCurrentMonth; d++) {
        const iso = formatIso(browseYear, browseMonth, d);
        list.push({
          day: d,
          isCurrentMonth: true,
          isoStr: iso,
          isDisabled: Boolean((minStr && iso < minStr) || (maxStr && iso > maxStr)),
          isSelected: internalVal === iso,
          isToday: todayIso === iso,
        });
      }

      const remaining = 42 - list.length;
      for (let d = 1; d <= remaining; d++) {
        const nextM = browseMonth === 12 ? 1 : browseMonth + 1;
        const nextY = browseMonth === 12 ? browseYear + 1 : browseYear;
        const iso = formatIso(nextY, nextM, d);
        list.push({
          day: d,
          isCurrentMonth: false,
          isoStr: iso,
          isDisabled: Boolean((minStr && iso < minStr) || (maxStr && iso > maxStr)),
          isSelected: internalVal === iso,
          isToday: todayIso === iso,
        });
      }

      return list;
    }, [
      browseYear,
      browseMonth,
      firstDayOfWeek,
      daysInCurrentMonth,
      prevMonthDaysCount,
      minStr,
      maxStr,
      internalVal,
      todayIso,
    ]);

    const monthNames = isRtl ? ARABIC_MONTHS : ENGLISH_MONTHS;
    const weekdayNames = isRtl ? ARABIC_WEEKDAYS : ENGLISH_WEEKDAYS;

    const currentMonthLabel = monthNames[browseMonth - 1];

    const yearGridStart = Math.floor(browseYear / 12) * 12;
    const yearGrid = useMemo(() => {
      return Array.from({ length: 12 }, (_, i) => yearGridStart + i);
    }, [yearGridStart]);

    return (
      <div
        ref={containerRef}
        className={cn("relative w-full", className)}
        onKeyDown={handleKeyDown}
      >
        <div
          onClick={() => {
            if (!disabled) {
              setOpen(true);
            }
          }}
          className={cn(
            "flex h-10 w-full items-center rounded border border-border/80 bg-background/50 px-3 text-sm shadow-xs transition-colors cursor-text focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
            open && "border-primary ring-1 ring-primary",
            disabled && "cursor-not-allowed opacity-50 bg-muted/20",
          )}
        >
          <input
            {...props}
            ref={(node) => {
              inputRef.current = node;
              if (typeof forwardedRef === "function") {
                forwardedRef(node);
              } else if (forwardedRef) {
                forwardedRef.current = node;
              }
            }}
            id={id}
            name={name}
            type="text"
            autoComplete="off"
            value={internalVal}
            onChange={handleInputChange}
            disabled={disabled}
            placeholder={placeholder ?? (isRtl ? "سنة-شهر-يوم" : "YYYY-MM-DD")}
            className={cn(
              "h-full w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed font-mono text-xs md:text-sm",
              inputClassName,
            )}
          />

          {clearable && internalVal && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-muted-foreground/70 hover:text-foreground rounded transition-colors cursor-pointer shrink-0"
              title={isRtl ? "مسح التاريخ" : "Clear date"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}

          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) setOpen((prev) => !prev);
            }}
            tabIndex={-1}
            className="ms-1.5 p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
            title={isRtl ? "اختر التاريخ" : "Select date"}
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </div>

        {open && !disabled ? (
          <div
            ref={popoverRef}
            className={cn(
              "absolute z-50 mt-1.5 w-72 start-0 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-2xl transition-all duration-150 animate-in fade-in-50 zoom-in-95",
            )}
          >
            <div
              dir="ltr"
              className="flex items-center justify-between pb-2.5 mb-2 border-b border-border/60"
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevYear}
                  className="h-7 w-7 rounded p-0 inline-flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  title={isRtl ? "السنة السابقة" : "Previous year"}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="h-7 w-7 rounded p-0 inline-flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  title={isRtl ? "الشهر السابق" : "Previous month"}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              <div
                dir={isRtl ? "rtl" : "ltr"}
                className="flex items-center gap-1.5 text-xs font-bold text-foreground"
              >
                <button
                  type="button"
                  onClick={() =>
                    setViewMode((prev) => (prev === "months" ? "days" : "months"))
                  }
                  className="px-1.5 py-1 rounded hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  {currentMonthLabel}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setViewMode((prev) => (prev === "years" ? "days" : "years"))
                  }
                  className="px-1.5 py-1 rounded hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer font-mono"
                >
                  {browseYear}
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="h-7 w-7 rounded p-0 inline-flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  title={isRtl ? "الشهر القادم" : "Next month"}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextYear}
                  className="h-7 w-7 rounded p-0 inline-flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  title={isRtl ? "السنة القادمة" : "Next year"}
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {viewMode === "months" ? (
              <div className="grid grid-cols-3 gap-1.5 py-2">
                {monthNames.map((mName, idx) => {
                  const mNum = idx + 1;
                  const isCurrent = browseMonth === mNum;
                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => {
                        setBrowseMonth(mNum);
                        setViewMode("days");
                      }}
                      className={cn(
                        "h-8 rounded text-xs font-medium transition-colors cursor-pointer",
                        isCurrent
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {mName}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {viewMode === "years" ? (
              <div className="grid grid-cols-3 gap-1.5 py-2">
                {yearGrid.map((y) => {
                  const isCurrent = browseYear === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setBrowseYear(y);
                        setViewMode("months");
                      }}
                      className={cn(
                        "h-8 rounded font-mono text-xs font-medium transition-colors cursor-pointer",
                        isCurrent
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {viewMode === "days" ? (
              <div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground/80 mb-1">
                  {weekdayNames.map((wName) => (
                    <span key={wName} className="py-0.5 select-none">
                      {wName}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {daysList.map((item, index) => {
                    const isSelected = item.isSelected;
                    const isToday = item.isToday && !isSelected;

                    return (
                      <button
                        key={`${item.isoStr}-${index}`}
                        type="button"
                        disabled={item.isDisabled}
                        onClick={() => handleSelectDay(item.day)}
                        className={cn(
                          "h-8 w-full rounded text-xs font-medium flex items-center justify-center transition-all cursor-pointer font-mono select-none",
                          !item.isCurrentMonth && "text-muted-foreground/30",
                          item.isCurrentMonth &&
                            !isSelected &&
                            "text-foreground hover:bg-accent hover:text-accent-foreground",
                          isToday &&
                            "ring-1 ring-primary/80 text-primary font-bold bg-primary/5",
                          isSelected &&
                            "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90",
                          item.isDisabled &&
                            "opacity-20 cursor-not-allowed pointer-events-none",
                        )}
                      >
                        {item.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border/60 text-xs">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
              >
                {isRtl ? "اليوم" : "Today"}
              </button>
              {internalVal ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                >
                  {isRtl ? "مسح" : "Clear"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);
