"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  useCallback,
} from "react";
import SignaturePadLib from "signature_pad";
import { RotateCcw, CheckCircle2, PenLine, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export type SignaturePadHandle = {
  dataUrl: string | null;
  pointCount: number;
  clear: () => void;
};

const MIN_POINTS = 8;

export const SignaturePad = forwardRef<
  SignaturePadHandle,
  { onChange?: (valid: boolean) => void }
>(function SignaturePad({ onChange }, ref) {
  const t = useTranslations("signing");
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [points, setPoints] = useState(0);
  const [hasStartedDrawing, setHasStartedDrawing] = useState(false);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const pad = padRef.current;
    if (!canvas || !container || !pad) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const targetWidth = Math.round(rect.width * ratio);
    const targetHeight = Math.round(rect.height * ratio);

    if (canvas.width === targetWidth && canvas.height === targetHeight) {
      return;
    }

    const data = !pad.isEmpty() ? pad.toData() : null;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
    }

    pad.clear();
    if (data && data.length > 0) {
      pad.fromData(data);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = container.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : container.offsetWidth || 500;
    const h = rect.height > 0 ? rect.height : container.offsetHeight || 160;

    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    canvas.getContext("2d")?.scale(ratio, ratio);

    const pad = new SignaturePadLib(canvas, {
      minWidth: 1.5,
      maxWidth: 3.5,
      penColor: "#0f172a",
      velocityFilterWeight: 0.7,
      throttle: 0,
    });
    padRef.current = pad;

    const beginHandler = () => {
      setHasStartedDrawing(true);
    };

    const endHandler = () => {
      const total = pad
        .toData()
        .reduce((sum, group) => sum + group.points.length, 0);
      setPoints(total);
      if (total > 0) setHasStartedDrawing(true);
      onChangeRef.current?.(total >= MIN_POINTS);
    };

    pad.addEventListener("beginStroke", beginHandler);
    pad.addEventListener("endStroke", endHandler);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        resizeCanvas();
      });
      observer.observe(container);
    }

    const timer1 = setTimeout(resizeCanvas, 150);
    const timer2 = setTimeout(resizeCanvas, 350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      observer?.disconnect();
      pad.off();
      padRef.current = null;
    };
  }, [resizeCanvas]);

  useImperativeHandle(ref, () => ({
    get dataUrl() {
      if (!padRef.current || padRef.current.isEmpty()) return null;
      return padRef.current.toDataURL("image/png");
    },
    get pointCount() {
      if (!padRef.current || padRef.current.isEmpty()) return 0;
      return padRef.current
        .toData()
        .reduce((sum, group) => sum + group.points.length, 0);
    },
    clear() {
      padRef.current?.clear();
      setPoints(0);
      setHasStartedDrawing(false);
      onChange?.(false);
    },
  }));

  const handleClear = () => {
    padRef.current?.clear();
    setPoints(0);
    setHasStartedDrawing(false);
    onChange?.(false);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div
        ref={containerRef}
        className="group relative h-44 w-full overflow-hidden rounded-xl border border-border/90 bg-white dark:bg-slate-50/95 ring-1 ring-border/80 dark:ring-white/10 shadow-2xs select-none"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none cursor-crosshair"
        />

        <div className="pointer-events-none absolute bottom-8 inset-x-6 flex items-center gap-2 text-slate-400/80">
          <span className="font-serif text-sm font-bold text-slate-400 select-none">✕</span>
          <div className="h-px flex-1 border-b border-dashed border-slate-300" />
        </div>

        {!hasStartedDrawing && points === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-slate-400">
            <PenLine className="h-6 w-6 stroke-[1.5] text-slate-400/80" />
            <span className="text-xs font-medium">
              {t("drawHint")}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5">
          {points >= MIN_POINTS ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t("drawSuccess")}</span>
            </span>
          ) : points > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span>{t("drawIncomplete")}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t("drawGuide")}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleClear}
          disabled={points === 0 && !hasStartedDrawing}
          className="h-8 gap-1.5 px-3 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{t("clear")}</span>
        </Button>
      </div>
    </div>
  );
});
