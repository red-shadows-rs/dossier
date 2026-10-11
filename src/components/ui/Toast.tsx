"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import MuiAlert from "@mui/material/Alert";
import type { AlertColor } from "@mui/material/Alert";
import MuiBox from "@mui/material/Box";

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

const TONES: Record<ToastTone, AlertColor> = {
  info: "info",
  success: "success",
  error: "error",
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
      const duration = input.durationMs ?? 5000;
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <MuiBox
        sx={{
          position: "fixed",
          bottom: 16,
          insetInlineEnd: 16,
          zIndex: (theme) => theme.zIndex.snackbar,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          width: "min(22rem, calc(100vw - 2rem))",
          pointerEvents: "none",
        }}
      >
        {items.map((item) => (
          <MuiAlert
            key={item.id}
            severity={TONES[item.tone ?? "info"]}
            variant="outlined"
            onClose={() => dismiss(item.id)}
            sx={{ pointerEvents: "auto" }}
          >
            {item.title}
          </MuiAlert>
        ))}
      </MuiBox>
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