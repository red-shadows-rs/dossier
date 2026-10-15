"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileSignature, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { createContractAction } from "@/server/actions/contracts";

export function NewContractForm({
  projects,
  templates,
}: {
  projects: { id: string; label: string }[];
  templates: { id: string; label: string }[];
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setFieldErrors({});
    setStatusError(null);
    const result = await createContractAction({
      projectId: String(data.get("projectId") ?? ""),
      templateId: String(data.get("templateId") ?? ""),
    });
    setPending(false);
    if (result.ok) {
      router.push(`/contracts/${result.data.id}/edit`);
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
  }

  const err = (key: string): string | null => {
    const value = fieldErrors[key];
    return value ? t(value) : null;
  };

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
          <CardTitle>{t("contracts.newTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label={t("contracts.project")}
            htmlFor="nc-project"
            error={err("projectId")}
            required
          >
            <Select
              id="nc-project"
              name="projectId"
              disabled={pending}
            >
              <option value="">{t("contracts.selectProject")}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={t("contracts.template")}
            htmlFor="nc-template"
            error={err("templateId")}
            required
          >
            <Select
              id="nc-template"
              name="templateId"
              disabled={pending}
            >
              <option value="">{t("contracts.selectTemplate")}</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </Select>
          </Field>
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
          <FileSignature className="h-4 w-4" />
          {t("contracts.createDraft")}
        </Button>
      </div>
    </form>
  );
}
