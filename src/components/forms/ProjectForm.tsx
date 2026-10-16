"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FolderKanban, Save, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    for (const [key, value] of data.entries()) payload[key] = String(value);
    setPending(true);
    setFieldErrors({});
    setStatusError(null);
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
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
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
          <CardTitle className="inline-flex items-center gap-2">
            <FolderKanban size={18} className="text-primary" aria-hidden="true" />
            <span>{t("projects.details")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <Field
            label={t("projects.client")}
            htmlFor="project-client"
            error={fieldError("clientId")}
            required
          >
            <Select
              id="project-client"
              name="clientId"
              defaultValue={initial.clientId}
              disabled={pending}
            >
              <option value="">{t("projects.selectClient")}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("projects.statusLabel")} htmlFor="project-status">
            <Select
              id="project-status"
              name="status"
              defaultValue={initial.status}
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
            label={t("projects.nameAr")}
            htmlFor="project-name-ar"
            error={fieldError("nameAr")}
            required
          >
            <Input
              id="project-name-ar"
              name="nameAr"
              dir="rtl"
              lang="ar"
              defaultValue={initial.nameAr}
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
              name="nameEn"
              dir="ltr"
              lang="en"
              defaultValue={initial.nameEn}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field
            label={t("projects.startDate")}
            htmlFor="project-start"
            error={fieldError("startDate")}
          >
            <Input
              id="project-start"
              name="startDate"
              type="date"
              defaultValue={initial.startDate}
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
              name="endDate"
              type="date"
              defaultValue={initial.endDate}
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
              name="budget"
              dir="ltr"
              defaultValue={initial.budget}
              disabled={pending}
              className="text-start"
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
              name="currency"
              defaultValue={initial.currency}
              disabled={pending}
            >
              {Object.keys(CURRENCIES).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={t("projects.description")}
            htmlFor="project-description"
            error={fieldError("description")}
            className="md:col-span-2 2xl:col-span-3"
          >
            <Textarea
              id="project-description"
              name="description"
              defaultValue={initial.description}
              disabled={pending}
            />
          </Field>
          <Field
            label={t("projects.notes")}
            htmlFor="project-notes"
            error={fieldError("notes")}
            className="md:col-span-2 2xl:col-span-3"
          >
            <Textarea
              id="project-notes"
              name="notes"
              defaultValue={initial.notes}
              disabled={pending}
            />
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
          <Save className="h-4 w-4" />
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
