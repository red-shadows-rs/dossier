// Dossier - Template Form Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  Eye,
  Plus,
  Receipt,
  Save,
  ScrollText,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { LANG_MODES, TEMPLATE_TYPES } from "@/lib/constants";
import {
  createTemplateAction,
  updateTemplateAction,
} from "@/server/actions/templates";
import { validateTemplateClauses } from "@/server/templating/validate";
import { TemplateDocumentViewer } from "./TemplateDocumentViewer";

export type TemplateFormClause = {
  key: string | null;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

export type TemplateFormPresetRow = {
  titleAr: string;
  titleEn: string;
  percent: string;
  triggerNoteAr: string;
  triggerNoteEn: string;
};

export type TemplateFormValues = {
  type: "contract" | "nda" | "other";
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  defaultLanguageMode: "ar" | "en";
  hasFees: boolean;
  titleAr: string;
  titleEn: string;
  paymentTermsDays: string;
  presetEnabled: boolean;
  presetMode: "percent" | "fixed";
  presetRows: TemplateFormPresetRow[];
  clauses: TemplateFormClause[];
};

const EMPTY_CLAUSE: TemplateFormClause = {
  key: null,
  titleAr: "",
  titleEn: "",
  bodyAr: "",
  bodyEn: "",
};

const EMPTY_PRESET_ROW: TemplateFormPresetRow = {
  titleAr: "",
  titleEn: "",
  percent: "",
  triggerNoteAr: "",
  triggerNoteEn: "",
};

function toPreviewClauses(
  clauses: TemplateFormClause[],
): { key?: string | null; titleAr: string; titleEn: string; bodyAr: string; bodyEn: string }[] {
  return clauses.map((clause) => ({
    key: clause.key,
    titleAr: clause.titleAr,
    titleEn: clause.titleEn,
    bodyAr: clause.bodyAr,
    bodyEn: clause.bodyEn,
  }));
}

const STEPS = ["basics", "clauses", "defaults", "preview"] as const;
type Step = (typeof STEPS)[number];

const STEP_ICONS = {
  basics: SlidersHorizontal,
  clauses: ScrollText,
  defaults: Receipt,
  preview: Eye,
} as const;

function getClauseBlocks(body: string) {
  const blocks: { name: string; labelAr: string; labelEn: string; color: string }[] = [];
  if (body.includes("{{block.parties}}")) {
    blocks.push({
      name: "parties",
      labelAr: "أطراف العقد",
      labelEn: "Parties",
      color: "bg-muted text-foreground/80 border-border",
    });
  }
  if (body.includes("{{block.pricing_table}}")) {
    blocks.push({
      name: "pricing_table",
      labelAr: "جدول التسعير",
      labelEn: "Pricing Table",
      color: "bg-primary/10 text-primary border-primary/20",
    });
  }
  if (body.includes("{{block.payment_schedule}}")) {
    blocks.push({
      name: "payment_schedule",
      labelAr: "جدول الدفعات",
      labelEn: "Payment Schedule",
      color: "bg-primary/10 text-primary border-primary/20",
    });
  }
  if (body.includes("{{block.signatures}}")) {
    blocks.push({
      name: "signatures",
      labelAr: "كتلة التوقيع",
      labelEn: "Signatures",
      color: "bg-muted text-foreground/80 border-border",
    });
  }
  return blocks;
}

export function TemplateForm({
  mode,
  templateId,
  initial,
}: {
  mode: "create" | "edit";
  templateId?: string;
  initial: TemplateFormValues;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const toast = useToast();
  const router = useRouter();

  const [form, setForm] = useState<TemplateFormValues>(initial);
  const [step, setStep] = useState<Step>("basics");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<string | null>(null);

  const previewClauses = useMemo(
    () => toPreviewClauses(form.clauses),
    [form.clauses],
  );

  const liveIssues = useMemo(
    () => validateTemplateClauses(previewClauses, form.hasFees),
    [previewClauses, form.hasFees],
  );

  const presetSum = form.presetRows.reduce(
    (acc, row) => acc + (Number(row.percent) || 0),
    0,
  );

  function patch(next: Partial<TemplateFormValues>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function updateClause(index: number, next: Partial<TemplateFormClause>) {
    setForm((current) => ({
      ...current,
      clauses: current.clauses.map((clause, i) =>
        i === index ? { ...clause, ...next } : clause,
      ),
    }));
  }

  function insertSnippet(index: number, snippet: string) {
    setForm((current) => ({
      ...current,
      clauses: current.clauses.map((clause, i) => {
        if (i !== index) return clause;
        const appendSnippet = (currentText: string) => {
          const trimmed = currentText.trim();
          return trimmed ? `${trimmed}\n\n${snippet}` : snippet;
        };
        return {
          ...clause,
          bodyAr: appendSnippet(clause.bodyAr),
          bodyEn: appendSnippet(clause.bodyEn),
        };
      }),
    }));
    toast({
      title: isAr ? `تمت إضافة ${snippet}` : `Inserted ${snippet}`,
      tone: "success",
    });
  }

  function moveClause(index: number, delta: number) {
    setForm((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.clauses.length) return current;
      const clauses = [...current.clauses];
      [clauses[index], clauses[target]] = [clauses[target], clauses[index]];
      return { ...current, clauses };
    });
  }

  function duplicateClause(index: number) {
    setForm((current) => {
      const clauses = [...current.clauses];
      clauses.splice(index + 1, 0, { ...current.clauses[index] });
      return { ...current, clauses };
    });
  }

  function removeClause(index: number) {
    setForm((current) =>
      current.clauses.length > 1
        ? { ...current, clauses: current.clauses.filter((_, i) => i !== index) }
        : current,
    );
  }

  function addClause() {
    setForm((current) => ({
      ...current,
      clauses: [...current.clauses, { ...EMPTY_CLAUSE }],
    }));
  }

  function updatePresetRow(
    index: number,
    next: Partial<TemplateFormPresetRow>,
  ) {
    setForm((current) => ({
      ...current,
      presetRows: current.presetRows.map((row, i) =>
        i === index ? { ...row, ...next } : row,
      ),
    }));
  }

  function addPresetRow() {
    setForm((current) => ({
      ...current,
      presetRows: [...current.presetRows, { ...EMPTY_PRESET_ROW }],
    }));
  }

  function removePresetRow(index: number) {
    setForm((current) =>
      current.presetRows.length > 1
        ? {
            ...current,
            presetRows: current.presetRows.filter((_, i) => i !== index),
          }
        : current,
    );
  }

  function buildPayload() {
    const presetRows = form.presetRows
      .filter((row) => row.titleAr.trim() && row.titleEn.trim())
      .map((row) => {
        const base = {
          titleAr: row.titleAr.trim(),
          titleEn: row.titleEn.trim(),
          triggerNoteAr: row.triggerNoteAr.trim() || undefined,
          triggerNoteEn: row.triggerNoteEn.trim() || undefined,
        };
        if (form.presetMode === "percent") {
          return { ...base, percentBp: Math.round(Number(row.percent) * 100) };
        }
        return base;
      });
    const milestonePreset =
      form.presetEnabled && presetRows.length > 0
        ? { mode: form.presetMode, rows: presetRows }
        : undefined;
    const paymentTermsDays =
      form.paymentTermsDays.trim() === ""
        ? undefined
        : Number(form.paymentTermsDays);
    return {
      type: form.type,
      nameAr: form.nameAr,
      nameEn: form.nameEn,
      descriptionAr: form.descriptionAr,
      descriptionEn: form.descriptionEn,
      defaultLanguageMode: form.defaultLanguageMode,
      defaults: {
        hasFees: form.hasFees,
        titleAr: form.titleAr.trim() || undefined,
        titleEn: form.titleEn.trim() || undefined,
        paymentTermsDays,
        milestonePreset,
      },
      clauses: form.clauses.map((clause) => ({
        key: clause.key,
        titleAr: clause.titleAr,
        titleEn: clause.titleEn,
        bodyAr: clause.bodyAr,
        bodyEn: clause.bodyEn,
      })),
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    setStatusError(null);
    const payload = buildPayload();
    const result =
      mode === "create"
        ? await createTemplateAction(payload)
        : await updateTemplateAction({ ...payload, id: templateId });
    setPending(false);
    if (result.ok) {
      toast({ title: t("templates.saved"), tone: "success" });
      const id = result.data ? result.data.id : templateId;
      router.push(`/templates/${id}`);
      router.refresh();
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    const msg =
      result.error.code === "VALIDATION_FAILED"
        ? t("auth.requiredFields")
        : t(`errors.${result.error.code}`);
    setStatusError(msg);
    toast({ title: msg, tone: "error" });

    if (result.error.fieldErrors) {
      const keys = Object.keys(result.error.fieldErrors);
      if (keys.some((k) => k.startsWith("name") || k.startsWith("description") || k === "type")) {
        setStep("basics");
      } else if (keys.some((k) => k.startsWith("clauses"))) {
        setStep("clauses");
      } else if (keys.some((k) => k.startsWith("defaults"))) {
        setStep("defaults");
      }
    }
  }

  function fieldError(name: string): string | null {
    const key = fieldErrors[name];
    if (!key) return null;
    return key.startsWith("errors.")
      ? t(key)
      : t("errors.VALIDATION_FAILED");
  }

  const currentIndex = STEPS.indexOf(step);

  function goNext() {
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 pb-28">
      <div className="relative sm:sticky sm:top-14 z-20 rounded border border-border bg-card p-1 shadow-xs">
        <nav
          aria-label={t("templates.builder.steps")}
          className="flex items-center gap-1 overflow-x-auto touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-1.5"
        >
          {STEPS.map((value, index) => {
            const active = step === value;
            const completed = index < currentIndex;
            const Icon = STEP_ICONS[value];

            return (
              <button
                key={value}
                id={`tpl-step-btn-${value}`}
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => {
                  setStep(value);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded px-2.5 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer sm:px-3 sm:py-2 sm:text-sm",
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : completed
                      ? "text-foreground hover:bg-muted/60"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold shrink-0",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : completed
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                </div>

                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn(active ? "inline" : "hidden sm:inline")}>
                  {t(`templates.builder.step.${value}`)}
                </span>

                {value === "clauses" && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                      active ? "inline" : "hidden sm:inline",
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {form.clauses.length}
                  </span>
                )}

                {value === "clauses" && liveIssues.length > 0 && (
                  <span className="flex h-2 w-2 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {statusError ? (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{statusError}</span>
        </div>
      ) : null}

      {step === "basics" && (
        <Card className="animate-in fade-in-50 duration-200">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="inline-flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <span>{t("templates.basicInfo")}</span>
              </CardTitle>
              <Badge tone="gray" className="font-mono text-xs">
                {t(`templates.type.${form.type}`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <Field label={t("templates.typeLabel")} htmlFor="tpl-type">
              <Select
                id="tpl-type"
                value={form.type}
                onChange={(event) =>
                  patch({ type: event.target.value as TemplateFormValues["type"] })
                }
                disabled={pending}
              >
                {TEMPLATE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`templates.type.${type}`)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("templates.languageMode")} htmlFor="tpl-lang-mode">
              <Select
                id="tpl-lang-mode"
                value={form.defaultLanguageMode}
                onChange={(event) =>
                  patch({
                    defaultLanguageMode: event.target
                      .value as TemplateFormValues["defaultLanguageMode"],
                  })
                }
                disabled={pending}
              >
                {LANG_MODES.map((langMode) => (
                  <option key={langMode} value={langMode}>
                    {t(`templates.languageModes.${langMode}`)}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="hidden 2xl:block" />

            <Field
              label={t("templates.nameAr")}
              htmlFor="tpl-name-ar"
              error={fieldError("nameAr")}
              required
            >
              <Input
                id="tpl-name-ar"
                dir="rtl"
                lang="ar"
                value={form.nameAr}
                onChange={(event) => patch({ nameAr: event.target.value })}
                disabled={pending}
                className="text-start"
              />
            </Field>

            <Field
              label={t("templates.nameEn")}
              htmlFor="tpl-name-en"
              error={fieldError("nameEn")}
              required
            >
              <Input
                id="tpl-name-en"
                dir="ltr"
                lang="en"
                value={form.nameEn}
                onChange={(event) => patch({ nameEn: event.target.value })}
                disabled={pending}
                className="text-start"
              />
            </Field>

            <Field
              label={t("templates.descriptionAr")}
              htmlFor="tpl-desc-ar"
              className="md:col-span-2 2xl:col-span-3"
            >
              <Textarea
                id="tpl-desc-ar"
                dir="rtl"
                lang="ar"
                rows={3}
                value={form.descriptionAr}
                onChange={(event) => patch({ descriptionAr: event.target.value })}
                disabled={pending}
                className="text-start"
              />
            </Field>

            <Field
              label={t("templates.descriptionEn")}
              htmlFor="tpl-desc-en"
              className="md:col-span-2 2xl:col-span-3"
            >
              <Textarea
                id="tpl-desc-en"
                dir="ltr"
                lang="en"
                rows={3}
                value={form.descriptionEn}
                onChange={(event) => patch({ descriptionEn: event.target.value })}
                disabled={pending}
                className="text-start"
              />
            </Field>
          </CardContent>
        </Card>
      )}

      {step === "clauses" && (
        <div className="flex flex-col gap-4 animate-in fade-in-50 duration-200">
          <div
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between",
              liveIssues.length === 0
                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                : "border-amber-500/20 bg-amber-500/5 text-amber-400",
            )}
          >
            <div className="flex items-center gap-2.5">
              {liveIssues.length === 0 ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
              )}
              <div>
                <span className="text-xs font-semibold block">
                  {liveIssues.length === 0
                    ? t("templates.validationOk")
                    : isAr
                      ? `يوجد ${liveIssues.length} تنبيهات في صياغة البنود`
                      : `${liveIssues.length} issues detected in clauses`}
                </span>
                {liveIssues.length > 0 && (
                  <ul className="mt-1 list-disc ps-4 text-[11px] text-muted-foreground flex flex-col gap-0.5">
                    {liveIssues.map((issue, idx) => (
                      <li key={idx}>
                        {issue.clausePosition ? `${isAr ? "المادة" : "Clause"} ${issue.clausePosition}: ` : ""}
                        {t(issue.messageKey, issue.params)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5 self-start sm:self-auto shrink-0"
              onClick={addClause}
              disabled={pending}
            >
              <Plus className="h-4 w-4" />
              <span>{t("templates.clauseAdd")}</span>
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            {form.clauses.map((clause, index) => {
              const blocks = getClauseBlocks(clause.bodyAr + " " + clause.bodyEn);
              const clauseNum = index + 1;

              return (
                <Card
                  key={index}
                  className="overflow-hidden border border-border shadow-xs hover:border-border/80 transition-colors"
                >
                  <CardHeader className="bg-muted/20 border-b border-border/40 py-3 px-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-mono font-bold text-primary">
                          {clauseNum}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {clause.titleAr.trim() || `${isAr ? "المادة" : "Clause"} ${clauseNum}`}
                          </span>
                          {clause.titleEn.trim() && (
                            <span className="text-xs text-muted-foreground hidden sm:inline" dir="ltr">
                              ({clause.titleEn.trim()})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {blocks.map((b) => (
                            <span
                              key={b.name}
                              className={cn(
                                "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-mono font-medium",
                                b.color,
                              )}
                            >
                              {isAr ? b.labelAr : b.labelEn}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-0.5 border-s border-border/60 ps-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => moveClause(index, -1)}
                            disabled={index === 0 || pending}
                            title={t("templates.clauseUp")}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => moveClause(index, 1)}
                            disabled={index === form.clauses.length - 1 || pending}
                            title={t("templates.clauseDown")}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => duplicateClause(index)}
                            disabled={pending}
                            title={t("templates.clauseDuplicate")}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => removeClause(index)}
                            disabled={form.clauses.length <= 1 || pending}
                            title={t("common.delete")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field
                        label={t("contracts.clause.titleAr")}
                        htmlFor={`tpl-cl-title-ar-${index}`}
                        error={fieldError(`clauses.${index}.titleAr`)}
                        required
                      >
                        <Input
                          id={`tpl-cl-title-ar-${index}`}
                          dir="rtl"
                          lang="ar"
                          value={clause.titleAr}
                          onChange={(event) =>
                            updateClause(index, { titleAr: event.target.value })
                          }
                          disabled={pending}
                          className="text-start"
                        />
                      </Field>

                      <Field
                        label={t("contracts.clause.titleEn")}
                        htmlFor={`tpl-cl-title-en-${index}`}
                        error={fieldError(`clauses.${index}.titleEn`)}
                        required
                      >
                        <Input
                          id={`tpl-cl-title-en-${index}`}
                          dir="ltr"
                          lang="en"
                          value={clause.titleEn}
                          onChange={(event) =>
                            updateClause(index, { titleEn: event.target.value })
                          }
                          disabled={pending}
                          className="text-start"
                        />
                      </Field>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/60 bg-muted/20 p-2 text-xs">
                      <span className="text-[11px] font-medium text-muted-foreground me-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span>{isAr ? "إدراج سريع:" : "Quick insert:"}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => insertSnippet(index, "{{block.parties}}")}
                        className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-mono text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                      >
                        + parties
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet(index, "{{block.pricing_table}}")}
                        className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        + pricing_table
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet(index, "{{block.payment_schedule}}")}
                        className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        + payment_schedule
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet(index, "{{block.signatures}}")}
                        className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-mono text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        + signatures
                      </button>

                      <button
                        type="button"
                        onClick={() => insertSnippet(index, "{{contract.startDate}}")}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                      >
                        + startDate
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet(index, "{{contract.endDate}}")}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                      >
                        + endDate
                      </button>
                      <button
                        type="button"
                        onClick={() => insertSnippet(index, "{{contract.governingLaw}}")}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                      >
                        + governingLaw
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field
                        label={t("contracts.clause.bodyAr")}
                        htmlFor={`tpl-cl-body-ar-${index}`}
                        error={fieldError(`clauses.${index}.bodyAr`)}
                        required
                      >
                        <Textarea
                          id={`tpl-cl-body-ar-${index}`}
                          dir="rtl"
                          lang="ar"
                          rows={6}
                          value={clause.bodyAr}
                          onChange={(event) =>
                            updateClause(index, { bodyAr: event.target.value })
                          }
                          disabled={pending}
                          className="text-start font-sans leading-relaxed"
                        />
                      </Field>

                      <Field
                        label={t("contracts.clause.bodyEn")}
                        htmlFor={`tpl-cl-body-en-${index}`}
                        error={fieldError(`clauses.${index}.bodyEn`)}
                        required
                      >
                        <Textarea
                          id={`tpl-cl-body-en-${index}`}
                          dir="ltr"
                          lang="en"
                          rows={6}
                          value={clause.bodyEn}
                          onChange={(event) =>
                            updateClause(index, { bodyEn: event.target.value })
                          }
                          disabled={pending}
                          className="text-start font-sans leading-relaxed"
                        />
                      </Field>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Button
            type="button"
            variant="secondary"
            className="self-center gap-1.5 px-6 border-dashed"
            onClick={addClause}
            disabled={pending}
          >
            <Plus className="h-4 w-4" />
            <span>{t("templates.clauseAdd")}</span>
          </Button>
        </div>
      )}

      {step === "defaults" && (
        <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <span>{t("templates.defaults")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border border-border p-3.5 bg-muted/20">
                  <Checkbox
                    id="tpl-has-fees"
                    checked={form.hasFees}
                    onChange={(event) =>
                      patch({ hasFees: event.currentTarget.checked })
                    }
                    disabled={pending}
                    label={t("templates.hasFees")}
                  />
                </div>

                <Field
                  label={t("templates.paymentTerms")}
                  htmlFor="tpl-payment-terms"
                  error={fieldError("defaults.paymentTermsDays")}
                >
                  <Input
                    id="tpl-payment-terms"
                    type="number"
                    min={0}
                    max={365}
                    dir="ltr"
                    value={form.paymentTermsDays}
                    onChange={(event) =>
                      patch({ paymentTermsDays: event.target.value })
                    }
                    disabled={pending}
                    className="text-start"
                  />
                </Field>

                <Field label={t("templates.titleDefaultAr")} htmlFor="tpl-title-ar">
                  <Input
                    id="tpl-title-ar"
                    dir="rtl"
                    lang="ar"
                    value={form.titleAr}
                    onChange={(event) => patch({ titleAr: event.target.value })}
                    disabled={pending}
                    className="text-start"
                  />
                </Field>

                <Field label={t("templates.titleDefaultEn")} htmlFor="tpl-title-en">
                  <Input
                    id="tpl-title-en"
                    dir="ltr"
                    lang="en"
                    value={form.titleEn}
                    onChange={(event) => patch({ titleEn: event.target.value })}
                    disabled={pending}
                    className="text-start"
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="inline-flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <span>{t("templates.milestonePreset")}</span>
                </CardTitle>

                {form.presetEnabled && form.presetMode === "percent" && (
                  <Badge
                    tone={presetSum === 100 ? "green" : "amber"}
                    className="font-mono text-xs"
                  >
                    {t("templates.presetSum")}: {presetSum}%
                    {presetSum === 100 ? " ✓" : " (100% required)"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-lg border border-border p-3.5 bg-muted/20">
                <Checkbox
                  id="tpl-preset-enabled"
                  checked={form.presetEnabled}
                  onChange={(event) =>
                    patch({ presetEnabled: event.currentTarget.checked })
                  }
                  disabled={pending}
                  label={t("templates.milestonePresetEnabled")}
                />
              </div>

              {form.presetEnabled && (
                <div className="flex flex-col gap-4 animate-in fade-in-50 duration-150">
                  <div className="w-48">
                    <Field
                      label={t("templates.milestonePresetMode")}
                      htmlFor="tpl-preset-mode"
                    >
                      <Select
                        id="tpl-preset-mode"
                        value={form.presetMode}
                        onChange={(event) =>
                          patch({
                            presetMode: event.target
                              .value as TemplateFormValues["presetMode"],
                          })
                        }
                        disabled={pending}
                      >
                        <option value="percent">
                          {t("templates.presetModes.percent")}
                        </option>
                        <option value="fixed">
                          {t("templates.presetModes.fixed")}
                        </option>
                      </Select>
                    </Field>
                  </div>

                  <div className="flex flex-col gap-3">
                    {form.presetRows.map((row, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 gap-2.5 rounded-lg border border-border bg-card p-3 md:grid-cols-12 items-end shadow-2xs"
                      >
                        <Field
                          label={t("templates.presetRowTitleAr")}
                          htmlFor={`tpl-preset-ar-${index}`}
                          className="md:col-span-3"
                        >
                          <Input
                            id={`tpl-preset-ar-${index}`}
                            dir="rtl"
                            lang="ar"
                            value={row.titleAr}
                            onChange={(event) =>
                              updatePresetRow(index, { titleAr: event.target.value })
                            }
                            disabled={pending}
                            className="text-start"
                          />
                        </Field>

                        <Field
                          label={t("templates.presetRowTitleEn")}
                          htmlFor={`tpl-preset-en-${index}`}
                          className="md:col-span-3"
                        >
                          <Input
                            id={`tpl-preset-en-${index}`}
                            dir="ltr"
                            lang="en"
                            value={row.titleEn}
                            onChange={(event) =>
                              updatePresetRow(index, { titleEn: event.target.value })
                            }
                            disabled={pending}
                            className="text-start"
                          />
                        </Field>

                        {form.presetMode === "percent" ? (
                          <Field
                            label={t("templates.presetRowPercent")}
                            htmlFor={`tpl-preset-pct-${index}`}
                            className="md:col-span-2"
                          >
                            <Input
                              id={`tpl-preset-pct-${index}`}
                              type="number"
                              min={0}
                              max={100}
                              dir="ltr"
                              value={row.percent}
                              onChange={(event) =>
                                updatePresetRow(index, {
                                  percent: event.target.value,
                                })
                              }
                              disabled={pending}
                              className="text-start font-mono"
                            />
                          </Field>
                        ) : null}

                        <Field
                          label={t("templates.presetRowTriggerAr")}
                          htmlFor={`tpl-preset-tr-ar-${index}`}
                          className={form.presetMode === "percent" ? "md:col-span-2" : "md:col-span-3"}
                        >
                          <Input
                            id={`tpl-preset-tr-ar-${index}`}
                            dir="rtl"
                            lang="ar"
                            value={row.triggerNoteAr}
                            onChange={(event) =>
                              updatePresetRow(index, {
                                triggerNoteAr: event.target.value,
                              })
                            }
                            disabled={pending}
                            className="text-start text-xs"
                          />
                        </Field>

                        <div className="flex items-center justify-end md:col-span-1 pb-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => removePresetRow(index)}
                            disabled={form.presetRows.length <= 1 || pending}
                            title={t("common.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="self-start gap-1.5"
                    onClick={addPresetRow}
                    disabled={pending}
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t("templates.presetAddRow")}</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === "preview" && (
        <Card className="animate-in fade-in-50 duration-200">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <span>{t("templates.previewTitle")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              {t("templates.previewHint")}
            </p>

            <TemplateDocumentViewer
              clauses={previewClauses}
              defaultLang={form.defaultLanguageMode === "en" ? "en" : "ar"}
              templateTitleAr={form.titleAr.trim() || form.nameAr}
              templateTitleEn={form.titleEn.trim() || form.nameEn}
              hasFees={form.hasFees}
              paymentTermsDays={form.paymentTermsDays ? Number(form.paymentTermsDays) : undefined}
            />

            <p className="text-xs text-muted-foreground border-t border-border/40 pt-3">
              {t("templates.legalNotice")}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          {currentIndex > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={goPrev}
              disabled={pending}
              className="gap-1.5 text-xs sm:text-sm"
            >
              {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span>{t("common.previous")}</span>
            </Button>
          )}

          {currentIndex < STEPS.length - 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={goNext}
              disabled={pending}
              className="gap-1.5 text-xs sm:text-sm"
            >
              <span>{t("common.next")}</span>
              {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 ms-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={pending}
            className="gap-1.5 text-xs sm:text-sm"
          >
            <X className="h-4 w-4" />
            <span>{t("common.cancel")}</span>
          </Button>

          <Button
            type="submit"
            loading={pending}
            className="gap-2 px-5 font-medium text-xs sm:text-sm shadow-xs"
          >
            <Save className="h-4 w-4" />
            <span>{mode === "create" ? t("templates.create") : t("common.save")}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
