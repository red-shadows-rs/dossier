"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/components/ui/cn";

export type ToastTone = "info" | "success" | "error";

export type ToastInput = {
  title: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastItem = ToastInput & { id: number };

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_CONFIG: Record<
  ToastTone,
  {
    icon: typeof Info;
    border: string;
    accentBar: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  info: {
    icon: Info,
    border: "border-sky-500/25",
    accentBar: "bg-sky-500",
    iconBg: "bg-sky-500/10 text-sky-500 border border-sky-500/20",
    iconColor: "text-sky-500",
  },
  success: {
    icon: CheckCircle2,
    border: "border-emerald-500/25",
    accentBar: "bg-emerald-500",
    iconBg: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    iconColor: "text-emerald-500",
  },
  error: {
    icon: AlertCircle,
    border: "border-rose-500/25",
    accentBar: "bg-rose-500",
    iconBg: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
    iconColor: "text-rose-500",
  },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId;
      nextId += 1;
      setItems((current) => [...current, { ...input, id }]);
      const duration = input.durationMs ?? 4000;
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 end-4 z-50 flex w-full max-w-sm pointer-events-none flex-col gap-2 px-3"
      >
        {items.map((item) => {
          const cfg = TONE_CONFIG[item.tone ?? "info"];
          const Icon = cfg.icon;
          return (
            <div
              key={item.id}
              role="alert"
              className={cn(
                "pointer-events-auto relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border bg-card/95 p-3 shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 fade-in-0 duration-200 select-none",
                cfg.border,
              )}
            >
              {/* Leading accent edge */}
              <div
                className={cn("absolute inset-y-0 start-0 w-1", cfg.accentBar)}
                aria-hidden="true"
              />

              <div className="flex min-w-0 items-center gap-2.5 ps-1.5">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    cfg.iconBg,
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                </div>
                <span className="truncate text-xs font-semibold leading-normal text-foreground">
                  {item.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (input: ToastInput) => void {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
}