// Dossier - Number Input Ui Component
// https://github.com/red-shadows-rs/dossier

"use client";

import {
  forwardRef,
  useRef,
  useState,
  useEffect,
  type InputHTMLAttributes,
  type ReactNode,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/components/ui/cn";

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
> & {
  type?: string;
  size?: "small" | "medium" | number;
  inputClassName?: string;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  hideSteppers?: boolean;
};

function getPrecision(n: number | string): number {
  const s = String(n);
  if (!s.includes(".")) return 0;
  return s.split(".")[1]?.length ?? 0;
}

function calcStep(
  current: number,
  multiplier: number,
  stepVal: number,
  minVal?: number,
  maxVal?: number,
): number {
  const precision = Math.max(getPrecision(current), getPrecision(stepVal));
  const factor = 10 ** precision;
  let next = Math.round((current + multiplier * stepVal) * factor) / factor;
  if (minVal !== undefined && Number.isFinite(minVal) && next < minVal) {
    next = minVal;
  }
  if (maxVal !== undefined && Number.isFinite(maxVal) && next > maxVal) {
    next = maxVal;
  }
  return next;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    {
      id,
      name,
      value,
      defaultValue,
      onChange,
      onKeyDown,
      disabled,
      readOnly,
      min,
      max,
      step,
      placeholder,
      className,
      inputClassName,
      startAdornment,
      endAdornment,
      hideSteppers = false,
      dir,
      type: _type,
      size: _sz,
      ...props
    },
    forwardedRef,
  ) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [currentVal, setCurrentVal] = useState<string | number>(() => {
      if (value !== undefined) {
        return Array.isArray(value) ? value.join(",") : (value as string | number);
      }
      if (defaultValue !== undefined) {
        return Array.isArray(defaultValue)
          ? defaultValue.join(",")
          : (defaultValue as string | number);
      }
      return "";
    });

    useEffect(() => {
      if (value !== undefined) {
        setCurrentVal(
          Array.isArray(value) ? value.join(",") : (value as string | number),
        );
      }
    }, [value]);

    const repeatTimerRef = useRef<{
      timeout?: ReturnType<typeof setTimeout>;
      interval?: ReturnType<typeof setInterval>;
    }>({});

    const stopHold = () => {
      if (repeatTimerRef.current.timeout) {
        clearTimeout(repeatTimerRef.current.timeout);
        repeatTimerRef.current.timeout = undefined;
      }
      if (repeatTimerRef.current.interval) {
        clearInterval(repeatTimerRef.current.interval);
        repeatTimerRef.current.interval = undefined;
      }
    };

    useEffect(() => {
      return () => {
        stopHold();
      };
    }, []);

    const updateInputValue = (nextVal: number | string) => {
      const el = inputRef.current;
      if (!el) return;
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(el, String(nextVal));
      } else {
        el.value = String(nextVal);
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const triggerStep = (multiplier: number) => {
      const el = inputRef.current;
      if (!el || disabled || readOnly) return;
      const raw = el.value.trim();
      const parsed =
        raw === ""
          ? min !== undefined
            ? Number(min)
            : 0
          : Number(raw);
      const base = Number.isFinite(parsed) ? parsed : 0;
      const stepVal = step !== undefined ? Number(step) : 1;
      const effectiveStep =
        Number.isFinite(stepVal) && stepVal > 0 ? stepVal : 1;
      const minVal = min !== undefined ? Number(min) : undefined;
      const maxVal = max !== undefined ? Number(max) : undefined;

      const next = calcStep(base, multiplier, effectiveStep, minVal, maxVal);
      setCurrentVal(next);
      updateInputValue(next);
    };

    const startHold = (multiplier: number) => {
      if (disabled || readOnly) return;
      triggerStep(multiplier);
      stopHold();
      repeatTimerRef.current.timeout = setTimeout(() => {
        repeatTimerRef.current.interval = setInterval(() => {
          triggerStep(multiplier);
        }, 60);
      }, 350);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled || readOnly) {
        onKeyDown?.(e);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const multiplier = e.shiftKey ? 10 : 1;
        triggerStep(multiplier);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const multiplier = e.shiftKey ? 10 : 1;
        triggerStep(-multiplier);
      } else if (e.key === "PageUp") {
        e.preventDefault();
        triggerStep(10);
      } else if (e.key === "PageDown") {
        e.preventDefault();
        triggerStep(-10);
      }
      onKeyDown?.(e);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      setCurrentVal(e.target.value);
      onChange?.(e);
    };

    const numVal =
      currentVal === "" ? null : Number(currentVal);
    const isAtMax =
      max !== undefined &&
      numVal !== null &&
      Number.isFinite(numVal) &&
      numVal >= Number(max);
    const isAtMin =
      min !== undefined &&
      numVal !== null &&
      Number.isFinite(numVal) &&
      numVal <= Number(min);

    return (
      <div
        className={cn(
          "group flex h-10 w-full items-center rounded border border-border/80 bg-background/50 text-sm shadow-xs transition-colors",
          "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden",
          disabled && "cursor-not-allowed opacity-50 bg-muted/20",
          className,
        )}
      >
        {startAdornment ? (
          <div className="flex items-center ps-3 pe-1 select-none text-muted-foreground text-xs font-medium shrink-0">
            {startAdornment}
          </div>
        ) : null}

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
          type="number"
          min={min}
          max={max}
          step={step}
          dir={dir ?? "ltr"}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-full w-full min-w-0 bg-transparent px-3 py-2 text-foreground font-mono text-sm",
            "placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed",
            inputClassName,
          )}
        />

        {endAdornment ? (
          <div className="flex items-center px-2.5 select-none text-muted-foreground text-xs font-semibold shrink-0">
            {endAdornment}
          </div>
        ) : null}

        {!hideSteppers ? (
          <div className="flex flex-col border-s border-border/80 h-full w-7 divide-y divide-border/60 shrink-0 select-none bg-muted/15 group-hover:bg-muted/25 transition-colors">
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled || readOnly || isAtMax}
              onMouseDown={() => startHold(1)}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={() => startHold(1)}
              onTouchEnd={stopHold}
              onClick={(e) => e.preventDefault()}
              aria-label="Increment"
              className={cn(
                "flex-1 flex items-center justify-center text-muted-foreground hover:bg-accent/80 hover:text-primary transition-all cursor-pointer active:bg-accent disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
              )}
            >
              <ChevronUp className="h-3 w-3 transition-transform active:-translate-y-0.5" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled || readOnly || isAtMin}
              onMouseDown={() => startHold(-1)}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={() => startHold(-1)}
              onTouchEnd={stopHold}
              onClick={(e) => e.preventDefault()}
              aria-label="Decrement"
              className={cn(
                "flex-1 flex items-center justify-center text-muted-foreground hover:bg-accent/80 hover:text-primary transition-all cursor-pointer active:bg-accent disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
              )}
            >
              <ChevronDown className="h-3 w-3 transition-transform active:translate-y-0.5" />
            </button>
          </div>
        ) : null}
      </div>
    );
  },
);
