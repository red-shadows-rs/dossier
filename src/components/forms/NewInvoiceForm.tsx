"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { LANG_MODES } from "@/lib/constants";
import {
  createInvoiceAction,
  createInvoiceFromMilestoneAction,
} from "@/server/actions/invoices";

export function NewInvoiceForm({
  projects,
  milestones,
}: {
  projects: { id: string; label: string }[];
  milestones: { milestoneId: string; label: string }[];
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [mode, setMode] = useState<"standalone" | "milestone">(
    milestones.length > 0 ? "milestone" : "standalone",
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    const result =
      mode === "milestone"
        ? await createInvoiceFromMilestoneAction({
            milestoneId: String(data.get("milestoneId") ?? ""),
          })
        : await createInvoiceAction({
            projectId: String(data.get("projectId") ?? ""),
            languageMode: String(data.get("languageMode") ?? "bilingual"),
            notesAr: String(data.get("notesAr") ?? ""),
            notesEn: String(data.get("notesEn") ?? ""),
          });
    setPending(false);
    if (result.ok) {
      router.push(`/invoices/${result.data.id}/edit`);
      router.refresh();
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("invoices.newTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              aria-current={mode === "milestone" ? "true" : undefined}
              onClick={() => setMode("milestone")}
              disabled={milestones.length === 0}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${
                mode === "milestone"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("invoices.fromMilestone")}
            </button>
            <button
              type="button"
              aria-current={mode === "standalone" ? "true" : undefined}
              onClick={() => setMode("standalone")}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                mode === "standalone"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("invoices.standalone")}
            </button>
          </div>

          {mode === "milestone" ? (
            <Field
              label={t("invoices.milestone")}
              htmlFor="ni-milestone"
              required
            >
              <Select
                id="ni-milestone"
                name="milestoneId"
                disabled={pending}
                required
              >
                <option value="">{t("invoices.selectMilestone")}</option>
                {milestones.map((milestone) => (
                  <option
                    key={milestone.milestoneId}
                    value={milestone.milestoneId}
                  >
                    {milestone.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label={t("invoices.project")}
                htmlFor="ni-project"
                required
              >
                <Select
                  id="ni-project"
                  name="projectId"
                  disabled={pending}
                  required
                >
                  <option value="">{t("invoices.selectProject")}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("invoices.languageMode")} htmlFor="ni-lang">
                <Select
                  id="ni-lang"
                  name="languageMode"
                  defaultValue="bilingual"
                  disabled={pending}
                >
                  {LANG_MODES.map((value) => (
                    <option key={value} value={value}>
                      {t(`contracts.languageModes.${value}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={t("invoices.notesAr")}
                htmlFor="ni-notes-ar"
                className="md:col-span-2"
              >
                <Textarea
                  id="ni-notes-ar"
                  name="notesAr"
                  dir="rtl"
                  lang="ar"
                  disabled={pending}
                  className="text-start"
                />
              </Field>
              <Field
                label={t("invoices.notesEn")}
                htmlFor="ni-notes-en"
                className="md:col-span-2"
              >
                <Textarea
                  id="ni-notes-en"
                  name="notesEn"
                  dir="ltr"
                  lang="en"
                  disabled={pending}
                  className="text-start"
                />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

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
          {t("invoices.createDraft")}
        </Button>
      </div>
    </form>
  );
}
