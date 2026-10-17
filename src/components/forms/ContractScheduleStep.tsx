"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/components/ui/cn";
import type { CurrencyCode } from "@/lib/constants";
import { formatMoney, parseMajorToMinor } from "@/lib/money";
import { saveMilestonesAction } from "@/server/actions/contracts";
import type { BuilderMilestone, BuilderPreset } from "./ContractBuilder";

type Row = {
  titleAr: string;
  titleEn: string;
  percent: string;
  amount: string;
  dueDate: string;
  triggerNoteAr: string;
  triggerNoteEn: string;
};

function toRows(milestones: BuilderMilestone[]): Row[] {
  return milestones.map((m) => ({
    titleAr: m.titleAr,
    titleEn: m.titleEn,
    percent: m.percentBp !== null ? String(m.percentBp / 100) : "",
    amount: m.amountMinor !== null ? String(m.amountMinor / 100) : "",
    dueDate: m.dueDate ?? "",
    triggerNoteAr: m.triggerNoteAr ?? "",
    triggerNoteEn: m.triggerNoteEn ?? "",
  }));
}

export function ContractScheduleStep({
  id,
  currency,
  mode: initialMode,
  initial,
  preset,
  onSaved,
  onPrev,
  onNext,
}: {
  id: string;
  currency: string;
  mode: "percent" | "fixed";
  initial: BuilderMilestone[];
  preset: BuilderPreset;
  onSaved: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const t = useTranslations();
  const toast = useToast();
  const [mode, setMode] = useState<"percent" | "fixed">(initialMode);
  const [rows, setRows] = useState<Row[]>(() =>
    initial.length > 0
      ? toRows(initial)
      : [
          {
            titleAr: "",
            titleEn: "",
            percent: "100",
            amount: "",
            dueDate: "",
            triggerNoteAr: "",
            triggerNoteEn: "",
          },
        ],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencyCode = currency as CurrencyCode;

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function resetToPreset() {
    if (!preset) return;
    setMode(preset.mode);
    setRows(
      preset.rows.map((row) => ({
        titleAr: row.titleAr,
        titleEn: row.titleEn,
        percent: row.percentBp !== undefined ? String(row.percentBp / 100) : "",
        amount: "",
        dueDate: "",
        triggerNoteAr: row.triggerNoteAr ?? "",
        triggerNoteEn: row.triggerNoteEn ?? "",
      })),
    );
    toast({ title: t("contracts.saved"), tone: "info" });
  }

  function buildPayload() {
    const mapped = rows.map((row) => {
      const percentBp =
        mode === "percent" ? Math.round(Number(row.percent) * 100) : null;
      let amountMinor: number | null = null;
      if (mode === "fixed") {
        try {
          amountMinor = parseMajorToMinor(row.amount, currencyCode);
        } catch {
          amountMinor = null;
        }
      }
      return {
        titleAr: row.titleAr,
        titleEn: row.titleEn,
        percentBp,
        amountMinor,
        dueDate: row.dueDate || null,
        triggerNoteAr: row.triggerNoteAr || null,
        triggerNoteEn: row.triggerNoteEn || null,
      };
    });
    return { mode, rows: mapped };
  }

  const sum = rows.reduce((acc, row) => {
    if (mode === "percent") return acc + (Number(row.percent) || 0);
    try {
      return acc + parseMajorToMinor(row.amount || "0", currencyCode);
    } catch {
      return acc;
    }
  }, 0);

  async function handleSave(advance: boolean = false) {
    setPending(true);
    setError(null);
    const result = await saveMilestonesAction({ id, ...buildPayload() });
    setPending(false);
    if (result.ok) {
      toast({ title: t("contracts.saved"), tone: "success" });
      onSaved();
      if (advance && onNext) {
        onNext();
      }
      return;
    }
    setError(result.error.fieldErrors?.milestones ?? null);
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSave(false);
  }

  const isPercentComplete = mode === "percent" && Math.round(sum) === 100;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {t("contracts.builder.scheduleTitle")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("contracts.milestones")} ({rows.length})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Field label="" className="mb-0">
              <Select
                id="cb-sched-mode"
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as "percent" | "fixed")
                }
                className="w-40 text-xs font-semibold"
              >
                <option value="percent">{t("contracts.mode.percent")}</option>
                <option value="fixed">{t("contracts.mode.fixed")}</option>
              </Select>
            </Field>

            {preset ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetToPreset}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t("contracts.resetToPreset")}</span>
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {/* Progress / Status banner */}
          <div className="rounded-md border border-border/80 bg-muted/30 p-3.5">
            {mode === "percent" ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">
                    {t("contracts.milestone.sum")}:
                  </span>
                  <span
                    className={cn(
                      "font-mono font-bold",
                      isPercentComplete
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {sum}% / 100%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      isPercentComplete ? "bg-emerald-500" : "bg-amber-500",
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, sum))}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">
                  {t("contracts.milestone.sum")}:
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatMoney(sum, currencyCode, "en")}
                </span>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive"
            >
              {t(error)}
            </p>
          ) : null}

          {/* Milestones list */}
          <div className="flex flex-col gap-3.5">
            {rows.map((row, index) => (
              <div
                key={index}
                className="group flex flex-col gap-3 rounded-md border border-border/80 bg-card p-4 shadow-2xs transition-all hover:border-border hover:shadow-xs"
              >
                {/* Milestone Card Header */}
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground font-mono">
                    #{index + 1}
                  </span>
                  <Tooltip content={t("common.delete")}>
                    <button
                      type="button"
                      aria-label={t("common.delete")}
                      onClick={() =>
                        setRows((current) =>
                          current.length > 1
                            ? current.filter((_, i) => i !== index)
                            : current,
                        )
                      }
                      disabled={rows.length <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                </div>

                {/* Row 1: Titles (AR / EN) */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field
                    label={t("contracts.milestone.titleAr")}
                    htmlFor={`ms-ar-${index}`}
                  >
                    <Input
                      id={`ms-ar-${index}`}
                      dir="rtl"
                      lang="ar"
                      value={row.titleAr}
                      onChange={(event) =>
                        updateRow(index, { titleAr: event.target.value })
                      }
                      className="text-start"
                    />
                  </Field>
                  <Field
                    label={t("contracts.milestone.titleEn")}
                    htmlFor={`ms-en-${index}`}
                  >
                    <Input
                      id={`ms-en-${index}`}
                      dir="ltr"
                      lang="en"
                      value={row.titleEn}
                      onChange={(event) =>
                        updateRow(index, { titleEn: event.target.value })
                      }
                      className="text-start"
                    />
                  </Field>
                </div>

                {/* Row 2: Percentage/Amount, Due Date, Trigger AR, Trigger EN */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
                  {mode === "percent" ? (
                    <Field
                      label={t("contracts.milestone.percent")}
                      htmlFor={`ms-pct-${index}`}
                      className="lg:col-span-3"
                    >
                      <div className="relative">
                        <Input
                          id={`ms-pct-${index}`}
                          dir="ltr"
                          value={row.percent}
                          onChange={(event) =>
                            updateRow(index, { percent: event.target.value })
                          }
                          className="pe-7 text-start font-mono"
                        />
                        <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-xs font-semibold text-muted-foreground">
                          %
                        </span>
                      </div>
                    </Field>
                  ) : (
                    <Field
                      label={t("contracts.milestone.amount")}
                      htmlFor={`ms-amt-${index}`}
                      className="lg:col-span-3"
                    >
                      <div className="relative">
                        <Input
                          id={`ms-amt-${index}`}
                          dir="ltr"
                          value={row.amount}
                          onChange={(event) =>
                            updateRow(index, { amount: event.target.value })
                          }
                          className="pe-12 text-start font-mono"
                        />
                        <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-[11px] font-mono font-medium text-muted-foreground">
                          {currency}
                        </span>
                      </div>
                    </Field>
                  )}

                  <Field
                    label={t("contracts.milestone.dueDate")}
                    htmlFor={`ms-due-${index}`}
                    className="lg:col-span-3"
                  >
                    <Input
                      id={`ms-due-${index}`}
                      type="date"
                      value={row.dueDate}
                      onChange={(event) =>
                        updateRow(index, { dueDate: event.target.value })
                      }
                      className="text-start"
                    />
                  </Field>

                  <Field
                    label={t("contracts.milestone.triggerAr")}
                    htmlFor={`ms-tr-ar-${index}`}
                    className="lg:col-span-3"
                  >
                    <Input
                      id={`ms-tr-ar-${index}`}
                      dir="rtl"
                      lang="ar"
                      value={row.triggerNoteAr}
                      onChange={(event) =>
                        updateRow(index, { triggerNoteAr: event.target.value })
                      }
                      className="text-start"
                    />
                  </Field>

                  <Field
                    label={t("contracts.milestone.triggerEn")}
                    htmlFor={`ms-tr-en-${index}`}
                    className="lg:col-span-3"
                  >
                    <Input
                      id={`ms-tr-en-${index}`}
                      dir="ltr"
                      lang="en"
                      value={row.triggerNoteEn}
                      onChange={(event) =>
                        updateRow(index, { triggerNoteEn: event.target.value })
                      }
                      className="text-start"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start gap-1.5"
            onClick={() =>
              setRows((current) => [
                ...current,
                {
                  titleAr: "",
                  titleEn: "",
                  percent: "",
                  amount: "",
                  dueDate: "",
                  triggerNoteAr: "",
                  triggerNoteEn: "",
                },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            <span>{t("contracts.milestone.add")}</span>
          </Button>
        </CardContent>
      </Card>

      {/* Unified Action Footer */}
      <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        {onPrev ? (
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-0 rotate-180" />
            <span>{t("contracts.builder.step.pricing")}</span>
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <Button
            type="submit"
            variant="secondary"
            loading={pending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{t("common.save")}</span>
          </Button>

          {onNext ? (
            <Button
              type="button"
              loading={pending}
              onClick={() => void handleSave(true)}
              className="gap-2"
            >
              <span>{t("contracts.builder.step.clauses")}</span>
              <ArrowLeft className="h-4 w-4 rtl:rotate-0 rotate-180" />
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
