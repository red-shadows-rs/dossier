"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FilePlus2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { INVOICE_LANG_MODES } from "@/lib/constants";
import { createInvoiceAction } from "@/server/actions/invoices";

export function NewInvoiceForm({
  projects,
}: {
  projects: { id: string; label: string }[];
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const projectId = String(data.get("projectId") ?? "");
    if (!projectId) {
      setStatusError(t("auth.requiredFields"));
      return;
    }
    setPending(true);
    setStatusError(null);
    const result = await createInvoiceAction({
      projectId,
      languageMode: String(data.get("languageMode") ?? "ar"),
      notesAr: String(data.get("notesAr") ?? ""),
      notesEn: String(data.get("notesEn") ?? ""),
    });
    setPending(false);
    if (result.ok) {
      router.push(`/invoices/${result.data.id}/edit`);
      router.refresh();
      return;
    }
    const msg =
      result.error.code === "VALIDATION_FAILED"
        ? t("auth.requiredFields")
        : t(`errors.${result.error.code}`);
    setStatusError(msg);
    toast({ title: msg, tone: "error" });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {statusError ? (
        <p
          role="alert"
          className="rounded border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive"
        >
          {statusError}
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{t("invoices.newTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
                defaultValue="ar"
                disabled={pending}
              >
                {INVOICE_LANG_MODES.map((value) => (
                  <option key={value} value={value}>
                    {t(`invoices.languageModes.${value}`)}
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
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={pending}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={pending} className="gap-2">
          <FilePlus2 className="h-4 w-4" />
          {t("invoices.createDraft")}
        </Button>
      </div>
    </form>
  );
}
