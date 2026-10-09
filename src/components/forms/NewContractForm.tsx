"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setFieldErrors({});
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
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  const err = (key: string): string | null => {
    const value = fieldErrors[key];
    return value ? t(value) : null;
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
              required
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
              required
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
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={pending}>
          {t("contracts.createDraft")}
        </Button>
      </div>
    </form>
  );
}
