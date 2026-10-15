"use client";

import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  Children,
  isValidElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type MouseEvent,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/components/ui/cn";

type OptionData = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

function parseOptions(children: ReactNode): OptionData[] {
  const options: OptionData[] = [];
  function walk(nodes: ReactNode) {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === "option") {
        const p = child.props as {
          value?: string | number;
          children?: ReactNode;
          disabled?: boolean;
          hidden?: boolean;
        };
        // Don't render hidden options in custom popover menu
        if (p.hidden) return;
        options.push({
          value: String(p.value ?? ""),
          label: p.children ?? String(p.value ?? ""),
          disabled: p.disabled,
        });
      } else if (child.props && (child.props as { children?: ReactNode }).children) {
        walk((child.props as { children?: ReactNode }).children);
      }
    });
  }
  walk(children);
  return options;
}

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "size"
> & {
  placeholder?: string;
  sx?: unknown;
  fullWidth?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      id,
      name,
      value,
      defaultValue,
      onChange,
      disabled,
      placeholder,
      className,
      children,
      sx: _sx,
      fullWidth: _fw,
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

    const options = parseOptions(children);
    const hiddenSelectRef = useRef<HTMLSelectElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const listboxRef = useRef<HTMLDivElement | null>(null);

    const isControlled = value !== undefined;
    const [selectedVal, setSelectedVal] = useState<string>(() => {
      if (value !== undefined) return String(value);
      if (defaultValue !== undefined) return String(defaultValue);
      return options[0]?.value ?? "";
    });

    const [open, setOpen] = useState(false);
    const [placement, setPlacement] = useState<"bottom" | "top">("bottom");

    useEffect(() => {
      if (isControlled) {
        setSelectedVal(String(value ?? ""));
      }
    }, [isControlled, value]);

    useEffect(() => {
      if (!isControlled && defaultValue !== undefined) {
        setSelectedVal(String(defaultValue ?? ""));
      }
    }, [isControlled, defaultValue]);

    // Calculate smart placement (bottom vs top) when opened
    useEffect(() => {
      if (!open || !containerRef.current) return;
      const updatePlacement = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const neededSpace = 250;

        if (spaceBelow < neededSpace && spaceAbove > spaceBelow) {
          setPlacement("top");
        } else {
          setPlacement("bottom");
        }
      };

      updatePlacement();
      window.addEventListener("resize", updatePlacement);
      window.addEventListener("scroll", updatePlacement, true);
      return () => {
        window.removeEventListener("resize", updatePlacement);
        window.removeEventListener("scroll", updatePlacement, true);
      };
    }, [open]);

    // Scroll selected option into view when opened
    useEffect(() => {
      if (open && listboxRef.current) {
        const selectedEl = listboxRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
        if (selectedEl) {
          selectedEl.scrollIntoView({ block: "nearest" });
        }
      }
    }, [open]);

    // Handle clicks outside container
    useEffect(() => {
      if (!open) return;
      const handleClickOutside = (e: globalThis.MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const handleSelectOption = useCallback(
      (optValue: string) => {
        if (!isControlled) {
          setSelectedVal(optValue);
        }
        setOpen(false);

        const selectEl = hiddenSelectRef.current;
        if (selectEl) {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLSelectElement.prototype,
            "value",
          )?.set;
          if (nativeSetter) {
            nativeSetter.call(selectEl, optValue);
          } else {
            selectEl.value = optValue;
          }
          const event = new Event("change", { bubbles: true });
          selectEl.dispatchEvent(event);
        }

        if (onChange) {
          const fakeEvent = {
            target: { value: optValue, name: name ?? "", id: id ?? "" },
            currentTarget: { value: optValue, name: name ?? "", id: id ?? "" },
          } as unknown as ChangeEvent<HTMLSelectElement>;
          onChange(fakeEvent);
        }
      },
      [isControlled, name, id, onChange],
    );

    const handleTriggerClick = (e: MouseEvent) => {
      e.preventDefault();
      if (!disabled) {
        setOpen((prev) => !prev);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" || e.key === "Tab") {
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          const currentIdx = options.findIndex((o) => o.value === selectedVal);
          const nextIdx = Math.min(options.length - 1, currentIdx + 1);
          if (options[nextIdx] && !options[nextIdx].disabled) {
            handleSelectOption(options[nextIdx].value);
          }
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          const currentIdx = options.findIndex((o) => o.value === selectedVal);
          const prevIdx = Math.max(0, currentIdx - 1);
          if (options[prevIdx] && !options[prevIdx].disabled) {
            handleSelectOption(options[prevIdx].value);
          }
        }
      } else if (e.key === "Home" && open) {
        e.preventDefault();
        const first = options.find((o) => !o.disabled);
        if (first) handleSelectOption(first.value);
      } else if (e.key === "End" && open) {
        e.preventDefault();
        const last = [...options].reverse().find((o) => !o.disabled);
        if (last) handleSelectOption(last.value);
      }
    };

    const activeOption = options.find((o) => o.value === selectedVal);
    const isPlaceholderActive = !selectedVal || (activeOption && activeOption.value === "");
    const displayLabel =
      activeOption?.label ??
      (placeholder ? (
        <span className="text-muted-foreground/60">{placeholder}</span>
      ) : (
        selectedVal || "-"
      ));

    return (
      <div
        ref={containerRef}
        className={cn("relative w-full select-none", open && "z-50", className)}
      >
        {/* Hidden native select for form data and accessibility */}
        <select
          ref={(node) => {
            hiddenSelectRef.current = node;
            if (typeof forwardedRef === "function") {
              forwardedRef(node);
            } else if (forwardedRef) {
              forwardedRef.current = node;
            }
          }}
          id={id}
          name={name}
          disabled={disabled}
          value={selectedVal}
          onChange={(e) => {
            setSelectedVal(e.target.value);
            onChange?.(e);
          }}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full opacity-0 pointer-events-none -z-10"
          {...props}
        >
          {placeholder ? (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          ) : null}
          {children}
        </select>

        {/* Custom Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleTriggerClick}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded border border-border/80 bg-background/50 px-3 py-2 text-start text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary hover:border-border hover:bg-background/80",
            isPlaceholderActive ? "text-muted-foreground/70" : "text-foreground",
            open && "border-primary ring-1 ring-primary bg-background/80",
            disabled && "cursor-not-allowed opacity-50 bg-muted/20 hover:bg-muted/20 hover:border-border/80",
          )}
        >
          <span className="truncate pe-2">{displayLabel}</span>
          <span
            className={cn(
              "text-muted-foreground transition-transform duration-200 shrink-0",
              open && "rotate-180 text-primary",
            )}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </button>

        {/* Floating Custom Menu Popover */}
        {open ? (
          <div
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            className={cn(
              "absolute start-0 z-50 max-h-60 w-full overflow-y-auto rounded-md border border-border/80 bg-popover/98 p-1 text-popover-foreground shadow-2xl backdrop-blur-md animate-in duration-150",
              placement === "top"
                ? "bottom-[calc(100%+4px)] fade-in-0 slide-in-from-bottom-2 origin-bottom"
                : "top-[calc(100%+4px)] fade-in-0 slide-in-from-top-2 origin-top",
            )}
          >
            {options.length === 0 ? (
              <div className="py-3 px-2 text-center text-xs text-muted-foreground">
                {isRtl ? "لا توجد خيارات متاحة" : "No options available"}
              </div>
            ) : (
              options.map((opt, idx) => {
                const isSelected = opt.value === selectedVal;
                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (!opt.disabled) {
                        handleSelectOption(opt.value);
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded px-2.5 py-2 text-sm transition-colors cursor-pointer select-none",
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted/60",
                      opt.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected ? (
                      <Check size={14} className="text-primary shrink-0" aria-hidden="true" />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    );
  },
);