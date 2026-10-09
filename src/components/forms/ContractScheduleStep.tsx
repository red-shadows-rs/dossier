"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
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
}: {
  id: string;
  currency: string;
  mode: "percent" | "fixed";
  initial: BuilderMilestone[];
  preset: BuilderPreset;
  onSaved: () => void;
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await saveMilestonesAction({ id, ...buildPayload() });
    setPending(false);
    if (result.ok) {
      toast({ title: t("contracts.saved"), tone: "success" });
      onSaved();
      return;
    }
    setError(result.error.fieldErrors?.milestones ?? null);
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("contracts.builder.scheduleTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("contracts.milestoneMode")} htmlFor="cb-sched-mode">
              <Select
                id="cb-sched-mode"
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as "percent" | "fixed")
                }
                className="w-44"
              >
                <option value="percent">{t("contracts.mode.percent")}</option>
                <option value="fixed">{t("contracts.mode.fixed")}</option>
              </Select>
            </Field>
            {preset ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={resetToPreset}
              >
                {t("contracts.resetToPreset")}
              </Button>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 md:grid-cols-12"
              >
                <Field
                  label={t("contracts.milestone.titleAr")}
                  htmlFor={`ms-ar-${index}`}
                  className="md:col-span-3"
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
                  className="md:col-span-3"
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
                {mode === "percent" ? (
                  <Field
                    label={t("contracts.milestone.percent")}
                    htmlFor={`ms-pct-${index}`}
                    className="md:col-span-1"
                  >
                    <Input
                      id={`ms-pct-${index}`}
                      dir="ltr"
                      value={row.percent}
                      onChange={(event) =>
                        updateRow(index, { percent: event.target.value })
                      }
                      className="text-start"
                    />
                  </Field>
                ) : (
                  <Field
                    label={t("contracts.milestone.amount")}
                    htmlFor={`ms-amt-${index}`}
                    className="md:col-span-2"
                  >
                    <Input
                      id={`ms-amt-${index}`}
                      dir="ltr"
                      value={row.amount}
                      onChange={(event) =>
                        updateRow(index, { amount: event.target.value })
                      }
                      className="text-start"
                    />
                  </Field>
                )}
                <Field
                  label={t("contracts.milestone.dueDate")}
                  htmlFor={`ms-due-${index}`}
                  className="md:col-span-2"
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
                  className="md:col-span-2"
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
                  className="md:col-span-2"
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
                <div className="flex items-end md:col-span-12">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setRows((current) =>
                        current.length > 1
                          ? current.filter((_, i) => i !== index)
                          : current,
                      )
                    }
                    disabled={rows.length <= 1}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
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
            {t("contracts.milestone.add")}
          </Button>

          <p className="text-sm text-muted-foreground" dir="ltr">
            {t("contracts.milestone.sum")}:{" "}
            {mode === "percent"
              ? `${sum.toFixed(2)}%`
              : formatMoney(Math.round(sum), currencyCode, "en")}
          </p>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {t(error)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
