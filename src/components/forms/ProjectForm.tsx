"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderKanban,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { CURRENCIES, PROJECT_STATUSES } from "@/lib/constants";
import {
  createProjectAction,
  updateProjectAction,
} from "@/server/actions/projects";

export type ProjectFormValues = {
  clientId: string;
  nameAr: string;
  nameEn: string;
  description: string;
  status: (typeof PROJECT_STATUSES)[number];
  startDate: string;
  endDate: string;
  budget: string;
  currency: string;
  notes: string;
};

type StepId = "basics" | "timeline" | "notes";

interface StepConfig {
  id: StepId;
  labelKey: string;
  icon: typeof FolderKanban;
}

const STEPS: readonly StepConfig[] = [
  { id: "basics", labelKey: "projects.formSteps.basics", icon: FolderKanban },
  { id: "timeline", labelKey: "projects.formSteps.timeline", icon: Calendar },
  { id: "notes", labelKey: "projects.formSteps.notes", icon: FileText },
];

export function ProjectForm({
  mode,
  projectId,
  initial,
  clients,
}: {
  mode: "create" | "edit";
  projectId?: string;
  initial: ProjectFormValues;
  clients: { id: string; label: string }[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const toast = useToast();
  const router = useRouter();

  const [step, setStep] = useState<StepId>("basics");
  const [form, setForm] = useState<ProjectFormValues>(initial);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<string | null>(null);

  const currentIndex = STEPS.findIndex((s) => s.id === step);

  function patch(values: Partial<ProjectFormValues>) {
    setForm((prev) => ({ ...prev, ...values }));
  }

  function goPrev() {
    if (currentIndex > 0) setStep(STEPS[currentIndex - 1].id);
  }

  function goNext() {
    if (currentIndex < STEPS.length - 1) setStep(STEPS[currentIndex + 1].id);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    setStatusError(null);

    const payload: Record<string, string> = {
      clientId: form.clientId,
      nameAr: form.nameAr,
      nameEn: form.nameEn,
      description: form.description,
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
      budget: form.budget,
      currency: form.currency,
      notes: form.notes,
    };

    const result =
      mode === "create"
        ? await createProjectAction(payload)
        : await updateProjectAction({ ...payload, id: projectId });

    setPending(false);

    if (result.ok) {
      toast({ title: t("projects.saved"), tone: "success" });
      const id =
        mode === "create" && result.data
          ? result.data.id
          : (projectId as string);
      router.push(`/projects/${id}`);
      router.refresh();
      return;
    }

    if (result.error.fieldErrors) {
      setFieldErrors(result.error.fieldErrors);
      if (
        result.error.fieldErrors.clientId ||
        result.error.fieldErrors.nameAr ||
        result.error.fieldErrors.nameEn ||
        result.error.fieldErrors.currency ||
        result.error.fieldErrors.budgetMinor
      ) {
        setStep("basics");
      } else if (
        result.error.fieldErrors.startDate ||
        result.error.fieldErrors.endDate ||
        result.error.fieldErrors.status
      ) {
        setStep("timeline");
      }
    }

    const msg =
      result.error.code === "VALIDATION_FAILED"
        ? t("auth.requiredFields")
        : t(`errors.${result.error.code}`);
    setStatusError(msg);
    toast({ title: msg, tone: "error" });
  }

  const fieldError = (name: string): string | null => {
    const key = fieldErrors[name];
    return key ? t(key) : null;
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 pb-28">
      <div className="rounded border border-border bg-card p-1 shadow-xs">
        <nav
          aria-label="Form Steps"
          className="flex items-center gap-1.5 text-xs sm:text-sm font-medium overflow-x-auto touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const active = s.id === step;
            const completed = idx < currentIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded px-2.5 py-1.5 sm:px-3 sm:py-2 transition-all text-start shrink-0 cursor-pointer",
                  active
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : completed
                      ? "bg-primary/10 text-primary hover:bg-primary/15 font-medium"
                      : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-xs font-mono font-bold",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : completed
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {idx + 1}
                </span>
                <span className={cn("items-center gap-1.5 truncate", active ? "inline-flex" : "hidden sm:inline-flex")}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{t(s.labelKey)}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {statusError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive animate-in fade-in-50"
        >
          {statusError}
        </div>
      )}

      {step === "basics" && (
        <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <FolderKanban size={18} className="text-primary" aria-hidden="true" />
                <span>{t("projects.formSteps.basics")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label={t("projects.client")}
                htmlFor="project-client"
                error={fieldError("clientId")}
                required
                className="md:col-span-2"
              >
                <Select
                  id="project-client"
                  value={form.clientId}
                  onChange={(e) => patch({ clientId: e.target.value })}
                  disabled={pending}
                >
                  <option value="">{t("projects.selectClient")}</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label={t("projects.nameAr")}
                htmlFor="project-name-ar"
                error={fieldError("nameAr")}
                required
              >
                <Input
                  id="project-name-ar"
                  dir="rtl"
                  lang="ar"
                  value={form.nameAr}
                  onChange={(e) => patch({ nameAr: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("projects.nameEn")}
                htmlFor="project-name-en"
                error={fieldError("nameEn")}
              >
                <Input
                  id="project-name-en"
                  dir="ltr"
                  lang="en"
                  value={form.nameEn}
                  onChange={(e) => patch({ nameEn: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("projects.budget")}
                htmlFor="project-budget"
                error={fieldError("budgetMinor")}
              >
                <Input
                  id="project-budget"
                  dir="ltr"
                  value={form.budget}
                  onChange={(e) => patch({ budget: e.target.value })}
                  disabled={pending}
                  placeholder="0.00"
                  className="text-start font-mono"
                />
              </Field>

              <Field
                label={t("projects.currency")}
                htmlFor="project-currency"
                error={fieldError("currency")}
                required
              >
                <Select
                  id="project-currency"
                  value={form.currency}
                  onChange={(e) => patch({ currency: e.target.value })}
                  disabled={pending}
                >
                  {Object.keys(CURRENCIES).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
              </Field>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "timeline" && (
        <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Calendar size={18} className="text-primary" aria-hidden="true" />
                <span>{t("projects.formSteps.timeline")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label={t("projects.statusLabel")}
                htmlFor="project-status"
                className="md:col-span-2"
              >
                <Select
                  id="project-status"
                  value={form.status}
                  onChange={(e) =>
                    patch({
                      status: e.target
                        .value as (typeof PROJECT_STATUSES)[number],
                    })
                  }
                  disabled={pending}
                >
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(`projects.status.${status}`)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label={t("projects.startDate")}
                htmlFor="project-start"
                error={fieldError("startDate")}
              >
                <Input
                  id="project-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => patch({ startDate: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("projects.endDate")}
                htmlFor="project-end"
                error={fieldError("endDate")}
              >
                <Input
                  id="project-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => patch({ endDate: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "notes" && (
        <div className="flex flex-col gap-5 animate-in fade-in-50 duration-200">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <FileText size={18} className="text-primary" aria-hidden="true" />
                <span>{t("projects.formSteps.notes")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field
                label={t("projects.description")}
                htmlFor="project-description"
                error={fieldError("description")}
              >
                <Textarea
                  id="project-description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>

              <Field
                label={t("projects.notes")}
                htmlFor="project-notes"
                error={fieldError("notes")}
              >
                <Textarea
                  id="project-notes"
                  rows={4}
                  value={form.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  disabled={pending}
                  className="text-start"
                />
              </Field>
            </CardContent>
          </Card>
        </div>
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
              {isAr ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
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
              {isAr ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
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
            <span>{t("common.save")}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
