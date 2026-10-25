// Dossier - New Milestone Invoice Form Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Layers, FilePlus2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { createInvoiceFromMilestoneAction } from "@/server/actions/invoices";

export function NewMilestoneInvoiceForm({
  milestones,
}: {
  milestones: { milestoneId: string; label: string }[];
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const milestoneId = String(data.get("milestoneId") ?? "");
    if (!milestoneId) {
      setStatusError(t("auth.requiredFields"));
      return;
    }
    setPending(true);
    setStatusError(null);
    const result = await createInvoiceFromMilestoneAction({ milestoneId });
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

  if (milestones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Layers size={18} className="text-primary" aria-hidden="true" />
            <span>{t("invoices.fromMilestoneTitle")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title={t("invoices.noInvoiceableMilestones")}
            action={
              <Button
                type="button"
                onClick={() => router.push("/invoices/new")}
                className="gap-1.5"
              >
                <Plus size={15} aria-hidden="true" />
                <span>{t("invoices.new")}</span>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
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
          <CardTitle className="inline-flex items-center gap-2">
            <Layers size={18} className="text-primary" aria-hidden="true" />
            <span>{t("invoices.fromMilestoneTitle")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            label={t("invoices.milestone")}
            htmlFor="ni-milestone"
            required
          >
            <Select
              id="ni-milestone"
              name="milestoneId"
              disabled={pending}
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
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href="/invoices">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            {t("common.cancel")}
          </Button>
        </Link>
        <Button type="submit" loading={pending} className="gap-2">
          <FilePlus2 className="h-4 w-4" />
          {t("invoices.createDraft")}
        </Button>
      </div>
    </form>
  );
}

