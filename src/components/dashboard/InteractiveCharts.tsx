"use client";

import { useState } from "react";
import { FileText, Receipt } from "lucide-react";
import type { Locale } from "@/lib/constants";
import type { MonthlyPoint } from "@/server/services/dashboard";
import { cn } from "@/components/ui/cn";

const CHART_COLORS = [
  "var(--primary)",
  "#38bdf8", 
  "#fbbf24", 
  "#34d399", 
  "#f87171", 
  "#a78bfa", 
  "#94a3b8", 
];

export function StatusDonut({
  title,
  kind,
  statuses,
  counts,
  labels,
  totalLabel = "الإجمالي",
}: {
  title: string;
  kind: "contracts" | "invoices";
  statuses: readonly string[];
  counts: Record<string, number>;
  labels: Record<string, string>;
  totalLabel?: string;
}) {
  const Icon = kind === "contracts" ? FileText : Receipt;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const data = statuses
    .map((status, index) => ({
      id: index,
      status,
      value: counts[status] ?? 0,
      label: labels[status] ?? status,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .filter((entry) => entry.value > 0);

  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const size = 160;
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let acc = 0;

  const activeEntry =
    hoveredIdx !== null ? data.find((d) => d.id === hoveredIdx) : null;

  return (
    <div className="relative flex h-full flex-col justify-between rounded-lg border border-border/80 bg-card p-4 shadow-xs sm:p-5">
      <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
          <Icon size={14} aria-hidden="true" />
        </span>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          -
        </div>
      ) : (
        <div className="relative flex flex-col items-center justify-center gap-6 py-2 sm:flex-row">
          <div
            className="relative shrink-0 select-none cursor-pointer"
            style={{ width: size, height: size }}
          >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--border)"
                strokeWidth={stroke}
              />
              {data.map((entry) => {
                const fraction = entry.value / total;
                const dash = fraction * circumference;
                const offset = -acc * circumference;
                acc += fraction;
                const isHovered = hoveredIdx === entry.id;

                return (
                  <circle
                    key={entry.id}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={entry.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    className="transition-opacity duration-150"
                    style={{
                      opacity: hoveredIdx !== null && !isHovered ? 0.4 : 1,
                      filter: isHovered ? "brightness(1.15)" : undefined,
                    }}
                    onMouseEnter={() => setHoveredIdx(entry.id)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              {activeEntry ? (
                <>
                  <span className="max-w-[100px] truncate px-1 text-center text-xs font-medium text-muted-foreground">
                    {activeEntry.label}
                  </span>
                  <span className="font-mono text-lg font-bold tracking-tight text-foreground">
                    {activeEntry.value}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-primary">
                    {Math.round((activeEntry.value / total) * 100)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                    {total}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {totalLabel}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex w-full max-w-xs flex-col gap-2">
            {data.map((entry) => {
              const isHovered = hoveredIdx === entry.id;
              const pct = Math.round((entry.value / total) * 100);
              return (
                <div
                  key={entry.id}
                  onMouseEnter={() => setHoveredIdx(entry.id)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={cn(
                    "flex cursor-pointer select-none items-center justify-between gap-2 rounded px-2 py-1 text-xs transition-colors",
                    isHovered
                      ? "bg-muted font-semibold text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="truncate">{entry.label}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 font-mono">
                    <span className="text-[11px] text-muted-foreground">{pct}%</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {entry.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function MonthlyChart({
  points,
  locale,
  issuedLabel,
  signedLabel,
}: {
  points: MonthlyPoint[];
  locale: Locale;
  issuedLabel: string;
  signedLabel: string;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<MonthlyPoint | null>(null);
  const max = Math.max(1, ...points.flatMap((p) => [p.issued, p.signed]));
  const fullMonthFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    month: "long",
  });
  const shortMonthFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    month: "short",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <span className="h-3 w-3 rounded-xs bg-primary shadow-[0_0_6px_var(--primary)]" />
          <span>{issuedLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <span className="h-3 w-3 rounded-xs bg-sky-500 shadow-[0_0_6px_#0ea5e9]" />
          <span>{signedLabel}</span>
        </div>
      </div>

      <div className="relative flex h-60 items-end gap-2 pt-28 sm:gap-4">
        {[0, 1, 2, 3].map((line) => (
          <div
            key={line}
            aria-hidden="true"
            style={{ top: `${(line / 4) * 100}%` }}
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/40"
          />
        ))}
        {points.map((point) => {
          const isHovered = hoveredPoint?.month === point.month;
          return (
            <div
              key={point.month}
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
              className={cn(
                "group relative z-1 flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-end rounded-md p-1.5 transition-colors select-none",
                isHovered ? "bg-muted/30" : "hover:bg-muted/15",
              )}
            >
              {isHovered ? (
                <div
                  className="pointer-events-none absolute -top-24 z-30 flex flex-col items-center animate-in fade-in-0 zoom-in-95 duration-150"
                  style={{ left: "50%", transform: "translateX(-50%)" }}
                  aria-hidden="true"
                >
                  <div className="flex flex-col gap-2 rounded-lg border border-border/90 bg-card/95 p-2.5 shadow-xl backdrop-blur-md min-w-[150px]">
                    <div className="flex items-center justify-between border-b border-border/50 pb-1 text-xs font-semibold text-foreground">
                      <span>{fullMonthFmt.format(new Date(`${point.month}-01T00:00:00Z`))}</span>
                      <span className="text-[10px] font-mono text-muted-foreground font-normal">
                        {point.month}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
                          <span>{issuedLabel}</span>
                        </div>
                        <span className="font-mono font-bold tabular-nums text-foreground">
                          {point.issued}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_6px_#0ea5e9]" />
                          <span>{signedLabel}</span>
                        </div>
                        <span className="font-mono font-bold tabular-nums text-foreground">
                          {point.signed}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="h-2 w-2 rotate-45 border-b border-e border-border/90 bg-card -mt-1 shadow-xs" />
                </div>
              ) : null}

              <div className="flex h-36 w-full items-end justify-center gap-1 sm:gap-1.5">
                <div
                  style={{ height: `${(point.issued / max) * 100}%` }}
                  className={cn(
                    "min-h-[4px] w-3.5 rounded-t bg-primary transition-opacity duration-150 sm:w-5",
                    hoveredPoint && !isHovered ? "opacity-35" : "opacity-100",
                    isHovered && "brightness-110 shadow-xs",
                  )}
                />
                <div
                  style={{ height: `${(point.signed / max) * 100}%` }}
                  className={cn(
                    "min-h-[4px] w-3.5 rounded-t bg-sky-500 transition-opacity duration-150 sm:w-5",
                    hoveredPoint && !isHovered ? "opacity-35" : "opacity-100",
                    isHovered && "brightness-110 shadow-xs",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs transition-colors",
                  isHovered
                    ? "font-bold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {shortMonthFmt.format(new Date(`${point.month}-01T00:00:00Z`))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
