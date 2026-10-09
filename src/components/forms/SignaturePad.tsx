"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import SignaturePadLib from "signature_pad";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

export type SignaturePadHandle = {
  dataUrl: string | null;
  pointCount: number;
};

const MIN_POINTS = 20;

export const SignaturePad = forwardRef<
  SignaturePadHandle,
  { onChange?: (valid: boolean) => void }
>(function SignaturePad({ onChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
    const pad = new SignaturePadLib(canvas, {
      minWidth: 0.8,
      maxWidth: 2.4,
      penColor: "#111111",
    });
    padRef.current = pad;
    const endHandler = () => {
      const total = pad
        .toData()
        .reduce((sum, group) => sum + group.points.length, 0);
      setPoints(total);
      onChange?.(total >= MIN_POINTS);
    };
    pad.addEventListener("endStroke", endHandler);
    return () => {
      pad.off();
      padRef.current = null;
    };
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    get dataUrl() {
      if (!padRef.current || padRef.current.isEmpty()) return null;
      return padRef.current.toDataURL("image/png");
    },
    get pointCount() {
      return points;
    },
  }));

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        className="h-40 w-full touch-none rounded-md border border-border bg-white"
      />
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs",
            points >= MIN_POINTS ? "text-muted-foreground" : "text-destructive",
          )}
          dir="ltr"
        >
          {points} / {MIN_POINTS}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            padRef.current?.clear();
            setPoints(0);
            onChange?.(false);
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
});
