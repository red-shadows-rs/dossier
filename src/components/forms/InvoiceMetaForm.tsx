"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { LANG_MODES } from "@/lib/constants";
import { updateInvoiceDraftAction } from "@/server/actions/invoices";

export function InvoiceMetaForm({
  id,
  initial,
}: {
  id: string;
  initial: {
    languageMode: "ar" | "en" | "bilingual";
    issueDate: string;
    dueDate: string;
    notesAr: string;
    notesEn: string;
  };
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    const result = await updateInvoiceDraftAction({
      id,
      languageMode: String(data.get("languageMode") ?? "bilingual"),
      issueDate: String(data.get("issueDate") ?? "") || null,
      dueDate: String(data.get("dueDate") ?? "") || null,
      notesAr: String(data.get("notesAr") ?? ""),
      notesEn: String(data.get("notesEn") ?? ""),
    });
    setPending(false);
    if (result.ok) {
      toast({ title: t("invoices.saved"), tone: "success" });
      router.refresh();
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("invoices.metaTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <Field label={t("invoices.languageMode")} htmlFor="inv-lang">
            <Select
              id="inv-lang"
              name="languageMode"
              defaultValue={initial.languageMode}
              disabled={pending}
            >
              {LANG_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`contracts.languageModes.${mode}`)}
                </option>
              ))}
            </Select>
          </Field>
          <span />
          <Field label={t("invoices.issueDate")} htmlFor="inv-issue">
            <Input
              id="inv-issue"
              name="issueDate"
              type="date"
              defaultValue={initial.issueDate}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field label={t("invoices.dueDate")} htmlFor="inv-due">
            <Input
              id="inv-due"
              name="dueDate"
              type="date"
              defaultValue={initial.dueDate}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field label={t("invoices.notesAr")} htmlFor="inv-notes-ar">
            <Textarea
              id="inv-notes-ar"
              name="notesAr"
              dir="rtl"
              lang="ar"
              defaultValue={initial.notesAr}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field label={t("invoices.notesEn")} htmlFor="inv-notes-en">
            <Textarea
              id="inv-notes-en"
              name="notesEn"
              dir="ltr"
              lang="en"
              defaultValue={initial.notesEn}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit" loading={pending}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
