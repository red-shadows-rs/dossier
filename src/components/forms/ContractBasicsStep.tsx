"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Layers,
  Save,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { CURRENCIES, LANG_MODES, type CurrencyCode } from "@/lib/constants";
import { updateContractBasicsAction } from "@/server/actions/contracts";
import type { BuilderBasics } from "./ContractBuilder";

export function ContractBasicsStep({
  id,
  projectLabel,
  templateLabel,
  currency,
  initial,
  onSaved,
  onNext,
}: {
  id: string;
  projectLabel: string;
  templateLabel: string;
  currency: string;
  initial: BuilderBasics;
  onSaved: () => void;
  onNext?: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [hasFees, setHasFees] = useState(initial.hasFees);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function performSave(formElement: HTMLFormElement, proceedNext = false) {
    const data = new FormData(formElement);
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
      if (proceedNext && onNext) {
        onNext();
      }
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void performSave(event.currentTarget, false);
  }

  const err = (key: string): string | null => {
    const value = fieldErrors[key];
    return value ? t(value) : null;
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* 1. General Info & Regional Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2.5 pb-4 border-b border-border/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              {isAr ? "البيانات الأساسية واللغة" : "Basic Information & Language"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? "ارتباط المشروع والقالب ولغة العقد والعملة المعتمدة"
                : "Project, template association, document language and contract currency"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
          <Field label={t("contracts.project")} htmlFor="cb-project">
            <div className="relative">
              <Input
                id="cb-project"
                value={projectLabel}
                disabled
                readOnly
                className="bg-muted/40 font-medium"
              />
            </div>
          </Field>
          <Field label={t("contracts.template")} htmlFor="cb-template">
            <Input
              id="cb-template"
              value={templateLabel}
              disabled
              readOnly
              className="bg-muted/40 font-medium"
            />
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
            <Select
              id="cb-currency"
              name="currency"
              defaultValue={initial.currency || currency || "SAR"}
              disabled={pending}
            >
              {Object.keys(CURRENCIES).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </Field>

          {/* Fees & Milestones Toggle Box */}
          <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border/80 bg-muted/20 p-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="cb-has-fees"
                checked={hasFees}
                onChange={(event) => setHasFees(event.currentTarget.checked)}
                disabled={pending}
              />
              <label htmlFor="cb-has-fees" className="flex flex-col cursor-pointer select-none">
                <span className="text-sm font-bold text-foreground">
                  {t("contracts.hasFees")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isAr
                    ? "تفعيل جدول الدفعات والبنود المالية وحساب الضريبة والخصم"
                    : "Enable financial pricing, milestones schedule, tax and discount calculations"}
                </span>
              </label>
            </div>

            {hasFees ? (
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {t("contracts.milestoneMode")}:
                </span>
                <Select
                  id="cb-mode"
                  name="milestoneMode"
                  defaultValue={initial.milestoneMode}
                  disabled={pending}
                  className="w-full sm:w-36 h-9 text-xs"
                >
                  <option value="percent">{t("contracts.mode.percent")}</option>
                  <option value="fixed">{t("contracts.mode.fixed")}</option>
                </Select>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* 2. Contract Title & Scope */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2.5 pb-4 border-b border-border/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              {isAr ? "مسمى العقد ونطاق العمل" : "Contract Title & Scope of Work"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? "عنوان الاتفاقية الرسمي والوصف التفصيلي لنطاق الخدمات المقدمة"
                : "Official agreement title and detailed description of deliverables"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
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
              className="text-start font-medium"
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
              className="text-start font-medium"
            />
          </Field>
          <Field
            label={t("contracts.scopeAr")}
            htmlFor="cb-scope-ar"
            error={err("scopeAr")}
          >
            <Textarea
              id="cb-scope-ar"
              name="scopeAr"
              dir="rtl"
              lang="ar"
              rows={4}
              defaultValue={initial.scopeAr}
              disabled={pending}
              className="text-start text-xs leading-relaxed"
            />
          </Field>
          <Field
            label={t("contracts.scopeEn")}
            htmlFor="cb-scope-en"
            error={err("scopeEn")}
          >
            <Textarea
              id="cb-scope-en"
              name="scopeEn"
              dir="ltr"
              lang="en"
              rows={4}
              defaultValue={initial.scopeEn}
              disabled={pending}
              className="text-start text-xs leading-relaxed"
            />
          </Field>
        </CardContent>
      </Card>

      {/* 3. Dates & Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2.5 pb-4 border-b border-border/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              {isAr ? "المدد والتواريخ التعاقدية" : "Contract Timeline & Payment Terms"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? "تاريخ سريان العقد وانتهائه وموعد التوقيع الأقصى ومهلة السداد"
                : "Effective dates, signing deadline, and payment terms in days"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
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
              className="text-start font-mono"
            />
          </Field>
        </CardContent>
      </Card>

      {/* 4. Legal Jurisdiction & Internal Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2.5 pb-4 border-b border-border/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground">
              {isAr ? "الإطار النظامي والملاحظات الداخلية" : "Legal Framework & Internal Notes"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? "القانون الحاكم والاختصاص القضائي وملاحظات سرية للفريق الداخلي"
                : "Governing law, judicial jurisdiction, and internal notes"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
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
              rows={2}
              defaultValue={initial.internalNotes}
              disabled={pending}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Unified Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-xs text-muted-foreground">
          {isAr
            ? "يتم حفظ التعديلات كمسودة ويمكن استكمالها في أي وقت"
            : "Changes are saved to draft and can be continued anytime"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            variant="secondary"
            loading={pending}
            className="gap-2 text-xs font-semibold"
          >
            <Save className="h-4 w-4" />
            <span>{t("common.save")}</span>
          </Button>

          {onNext ? (
            <Button
              type="button"
              onClick={(e) => {
                const form = e.currentTarget.closest("form");
                if (form) {
                  void performSave(form, true);
                }
              }}
              loading={pending}
              className="gap-2 text-xs font-semibold"
            >
              <span>
                {hasFees
                  ? isAr
                    ? "متابعة إلى التسعير"
                    : "Continue to Pricing"
                  : isAr
                    ? "متابعة إلى بنود العقد"
                    : "Continue to Clauses"}
              </span>
              {isAr ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

