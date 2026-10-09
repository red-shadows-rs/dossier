"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { LANG_MODES, TEMPLATE_TYPES } from "@/lib/constants";
import {
  createTemplateAction,
  updateTemplateAction,
} from "@/server/actions/templates";
import { renderTemplatePreviewHtml } from "@/server/templating/preview";
import { SAMPLE_SNAPSHOT } from "@/server/templating/sample-snapshot";
import { validateTemplateClauses } from "@/server/templating/validate";

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
  defaultLanguageMode: "ar" | "en" | "bilingual";
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
): { titleAr: string; titleEn: string; bodyAr: string; bodyEn: string }[] {
  return clauses.map((clause) => ({
    titleAr: clause.titleAr,
    titleEn: clause.titleEn,
    bodyAr: clause.bodyAr,
    bodyEn: clause.bodyEn,
  }));
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
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<TemplateFormValues>(initial);
  const [previewLang, setPreviewLang] = useState<"ar" | "en">("ar");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const previewClauses = useMemo(
    () => toPreviewClauses(form.clauses),
    [form.clauses],
  );

  const liveIssues = useMemo(
    () => validateTemplateClauses(previewClauses, form.hasFees),
    [previewClauses, form.hasFees],
  );

  const previewHtml = useMemo(
    () => renderTemplatePreviewHtml(previewClauses, previewLang, SAMPLE_SNAPSHOT),
    [previewClauses, previewLang],
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
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  // Server field errors carry message keys only (no interpolation params), so
  // only translate plain `errors.*` keys; anything else falls back to the
  // generic message. Clause-specific detail is shown by the live validator,
  // which has the full issue params.
  function fieldError(name: string): string | null {
    const key = fieldErrors[name];
    if (!key) return null;
    return key.startsWith("errors.")
      ? t(key)
      : t("errors.VALIDATION_FAILED");
  }

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("templates.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            className="md:col-span-2"
          >
            <Textarea
              id="tpl-desc-ar"
              dir="rtl"
              lang="ar"
              rows={2}
              value={form.descriptionAr}
              onChange={(event) => patch({ descriptionAr: event.target.value })}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field
            label={t("templates.descriptionEn")}
            htmlFor="tpl-desc-en"
            className="md:col-span-2"
          >
            <Textarea
              id="tpl-desc-en"
              dir="ltr"
              lang="en"
              rows={2}
              value={form.descriptionEn}
              onChange={(event) => patch({ descriptionEn: event.target.value })}
              disabled={pending}
              className="text-start"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("templates.defaults")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.hasFees}
                onChange={(event) => patch({ hasFees: event.currentTarget.checked })}
                disabled={pending}
                className="size-4 rounded border-border"
              />
              {t("templates.hasFees")}
            </label>
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

          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.presetEnabled}
                onChange={(event) =>
                  patch({ presetEnabled: event.currentTarget.checked })
                }
                disabled={pending}
                className="size-4 rounded border-border"
              />
              {t("templates.milestonePresetEnabled")}
            </label>

            {form.presetEnabled ? (
              <div className="flex flex-col gap-3">
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
                    className="w-44"
                  >
                    <option value="percent">
                      {t("templates.presetModes.percent")}
                    </option>
                    <option value="fixed">
                      {t("templates.presetModes.fixed")}
                    </option>
                  </Select>
                </Field>

                {form.presetRows.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 md:grid-cols-12"
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
                          dir="ltr"
                          value={row.percent}
                          onChange={(event) =>
                            updatePresetRow(index, {
                              percent: event.target.value,
                            })
                          }
                          disabled={pending}
                          className="text-start"
                        />
                      </Field>
                    ) : null}
                    <Field
                      label={t("templates.presetRowTriggerAr")}
                      htmlFor={`tpl-preset-tr-ar-${index}`}
                      className="md:col-span-2"
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
                        className="text-start"
                      />
                    </Field>
                    <Field
                      label={t("templates.presetRowTriggerEn")}
                      htmlFor={`tpl-preset-tr-en-${index}`}
                      className="md:col-span-2"
                    >
                      <Input
                        id={`tpl-preset-tr-en-${index}`}
                        dir="ltr"
                        lang="en"
                        value={row.triggerNoteEn}
                        onChange={(event) =>
                          updatePresetRow(index, {
                            triggerNoteEn: event.target.value,
                          })
                        }
                        disabled={pending}
                        className="text-start"
                      />
                    </Field>
                    <div className="flex items-end md:col-span-12">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePresetRow(index)}
                        disabled={form.presetRows.length <= 1 || pending}
                      >
                        {t("common.delete")}
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addPresetRow}
                    disabled={pending}
                  >
                    {t("templates.presetAddRow")}
                  </Button>
                  {form.presetMode === "percent" ? (
                    <span className="text-sm text-muted-foreground" dir="ltr">
                      {t("templates.presetSum")}: {presetSum.toFixed(2)}%
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("templates.clauseEditorTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {form.clauses.map((clause, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-md border border-border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground" dir="ltr">
                  {index + 1}
                </span>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveClause(index, -1)}
                    disabled={index === 0 || pending}
                  >
                    {t("templates.clauseUp")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveClause(index, 1)}
                    disabled={index === form.clauses.length - 1 || pending}
                  >
                    {t("templates.clauseDown")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateClause(index)}
                    disabled={pending}
                  >
                    {t("templates.clauseDuplicate")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeClause(index)}
                    disabled={form.clauses.length <= 1 || pending}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field
                  label={t("contracts.clause.titleAr")}
                  htmlFor={`tpl-cl-title-ar-${index}`}
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
                <Field
                  label={t("contracts.clause.bodyAr")}
                  htmlFor={`tpl-cl-body-ar-${index}`}
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
                    className="text-start"
                  />
                </Field>
                <Field
                  label={t("contracts.clause.bodyEn")}
                  htmlFor={`tpl-cl-body-en-${index}`}
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
                    className="text-start"
                  />
                </Field>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={addClause}
            disabled={pending}
          >
            {t("templates.clauseAdd")}
          </Button>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              {t("templates.validationTitle")}
            </span>
            {liveIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("templates.validationOk")}
              </p>
            ) : (
              <ul className="flex list-disc flex-col gap-1 ps-5 text-sm text-destructive">
                {liveIssues.map((issue, index) => (
                  <li key={index}>
                    {issue.clausePosition
                      ? `${issue.clausePosition}. `
                      : ""}
                    {t(issue.messageKey, issue.params)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasErrors ? (
            <p role="alert" className="text-sm text-destructive">
              {t("errors.VALIDATION_FAILED")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("templates.previewTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {t("templates.previewHint")}
            </p>
            <Field
              label={t("templates.previewLanguage")}
              htmlFor="tpl-preview-lang"
            >
              <Select
                id="tpl-preview-lang"
                value={previewLang}
                onChange={(event) =>
                  setPreviewLang(event.target.value as "ar" | "en")
                }
                className="w-40"
              >
                <option value="ar">{t("locale.ar")}</option>
                <option value="en">{t("locale.en")}</option>
              </Select>
            </Field>
          </div>
          <iframe
            title={t("templates.previewTitle")}
            sandbox=""
            srcDoc={previewHtml}
            className="h-[36rem] w-full rounded-md border border-border bg-white"
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t("templates.legalNotice")}</p>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={pending}
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={pending}>
          {mode === "create" ? t("templates.create") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
