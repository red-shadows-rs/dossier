"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { LANG_MODES } from "@/lib/constants";
import { updateContractBasicsAction } from "@/server/actions/contracts";
import type { BuilderBasics } from "./ContractBuilder";

export function ContractBasicsStep({
  id,
  projectLabel,
  templateLabel,
  currency,
  initial,
  onSaved,
}: {
  id: string;
  projectLabel: string;
  templateLabel: string;
  currency: string;
  initial: BuilderBasics;
  onSaved: () => void;
}) {
  const t = useTranslations();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [hasFees, setHasFees] = useState(initial.hasFees);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setFieldErrors({});
    const result = await updateContractBasicsAction({
      id,
      languageMode: data.get("languageMode"),
      titleAr: data.get("titleAr"),
      titleEn: data.get("titleEn"),
      scopeAr: data.get("scopeAr"),
      scopeEn: data.get("scopeEn"),
      startDate: data.get("startDate"),
      endDate: data.get("endDate"),
      signingDeadline: data.get("signingDeadline"),
      paymentTermsDays: Number(data.get("paymentTermsDays") ?? 0),
      governingLawAr: data.get("governingLawAr"),
      governingLawEn: data.get("governingLawEn"),
      jurisdictionAr: data.get("jurisdictionAr"),
      jurisdictionEn: data.get("jurisdictionEn"),
      internalNotes: data.get("internalNotes"),
      hasFees,
      currency: data.get("currency"),
      milestoneMode: data.get("milestoneMode"),
    });
    setPending(false);
    if (result.ok) {
      toast({ title: t("contracts.saved"), tone: "success" });
      onSaved();
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
          <CardTitle>{t("contracts.builder.basicsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t("contracts.project")} htmlFor="cb-project">
            <Input id="cb-project" value={projectLabel} disabled readOnly />
          </Field>
          <Field label={t("contracts.template")} htmlFor="cb-template">
            <Input id="cb-template" value={templateLabel} disabled readOnly />
          </Field>
          <Field
            label={t("contracts.languageMode")}
            htmlFor="cb-lang"
            error={err("languageMode")}
          >
            <Select
              id="cb-lang"
              name="languageMode"
              defaultValue={initial.languageMode}
              disabled={pending}
            >
              {LANG_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`templates.languageModes.${mode}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={t("contracts.currency")}
            htmlFor="cb-currency"
            error={err("currency")}
          >
            <Input
              id="cb-currency"
              name="currency"
              dir="ltr"
              defaultValue={initial.currency || currency}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={hasFees}
              onChange={(event) => setHasFees(event.currentTarget.checked)}
              disabled={pending}
              className="size-4 rounded border-border"
            />
            {t("contracts.hasFees")}
          </label>
          <Field label={t("contracts.milestoneMode")} htmlFor="cb-mode">
            <Select
              id="cb-mode"
              name="milestoneMode"
              defaultValue={initial.milestoneMode}
              disabled={pending || !hasFees}
            >
              <option value="percent">{t("contracts.mode.percent")}</option>
              <option value="fixed">{t("contracts.mode.fixed")}</option>
            </Select>
          </Field>

          <Field
            label={t("contracts.titleAr")}
            htmlFor="cb-title-ar"
            error={err("titleAr")}
          >
            <Input
              id="cb-title-ar"
              name="titleAr"
              dir="rtl"
              lang="ar"
              defaultValue={initial.titleAr}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field
            label={t("contracts.titleEn")}
            htmlFor="cb-title-en"
            error={err("titleEn")}
          >
            <Input
              id="cb-title-en"
              name="titleEn"
              dir="ltr"
              lang="en"
              defaultValue={initial.titleEn}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field
            label={t("contracts.scopeAr")}
            htmlFor="cb-scope-ar"
            error={err("scopeAr")}
            className="md:col-span-2"
          >
            <Textarea
              id="cb-scope-ar"
              name="scopeAr"
              dir="rtl"
              lang="ar"
              defaultValue={initial.scopeAr}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field
            label={t("contracts.scopeEn")}
            htmlFor="cb-scope-en"
            error={err("scopeEn")}
            className="md:col-span-2"
          >
            <Textarea
              id="cb-scope-en"
              name="scopeEn"
              dir="ltr"
              lang="en"
              defaultValue={initial.scopeEn}
              disabled={pending}
              className="text-start"
            />
          </Field>

          <Field
            label={t("contracts.startDate")}
            htmlFor="cb-start"
            error={err("startDate")}
          >
            <Input
              id="cb-start"
              name="startDate"
              type="date"
              defaultValue={initial.startDate}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field
            label={t("contracts.endDate")}
            htmlFor="cb-end"
            error={err("endDate")}
          >
            <Input
              id="cb-end"
              name="endDate"
              type="date"
              defaultValue={initial.endDate}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field
            label={t("contracts.signingDeadline")}
            htmlFor="cb-deadline"
            error={err("signingDeadline")}
          >
            <Input
              id="cb-deadline"
              name="signingDeadline"
              type="date"
              defaultValue={initial.signingDeadline}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field
            label={t("contracts.paymentTermsDays")}
            htmlFor="cb-terms"
            error={err("paymentTermsDays")}
          >
            <Input
              id="cb-terms"
              name="paymentTermsDays"
              type="number"
              min={0}
              max={365}
              defaultValue={initial.paymentTermsDays}
              disabled={pending}
              dir="ltr"
              className="text-start"
            />
          </Field>

          <Field
            label={t("contracts.governingLawAr")}
            htmlFor="cb-law-ar"
            error={err("governingLawAr")}
          >
            <Input
              id="cb-law-ar"
              name="governingLawAr"
              dir="rtl"
              lang="ar"
              defaultValue={initial.governingLawAr}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field
            label={t("contracts.governingLawEn")}
            htmlFor="cb-law-en"
            error={err("governingLawEn")}
          >
            <Input
              id="cb-law-en"
              name="governingLawEn"
              dir="ltr"
              lang="en"
              defaultValue={initial.governingLawEn}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field
            label={t("contracts.jurisdictionAr")}
            htmlFor="cb-jur-ar"
            error={err("jurisdictionAr")}
          >
            <Input
              id="cb-jur-ar"
              name="jurisdictionAr"
              dir="rtl"
              lang="ar"
              defaultValue={initial.jurisdictionAr}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field
            label={t("contracts.jurisdictionEn")}
            htmlFor="cb-jur-en"
            error={err("jurisdictionEn")}
          >
            <Input
              id="cb-jur-en"
              name="jurisdictionEn"
              dir="ltr"
              lang="en"
              defaultValue={initial.jurisdictionEn}
              disabled={pending}
              className="text-start"
            />
          </Field>
          <Field
            label={t("contracts.internalNotes")}
            htmlFor="cb-notes"
            error={err("internalNotes")}
            className="md:col-span-2"
          >
            <Textarea
              id="cb-notes"
              name="internalNotes"
              defaultValue={initial.internalNotes}
              disabled={pending}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
