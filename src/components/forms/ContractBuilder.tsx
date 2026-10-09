"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
import { ContractBasicsStep } from "./ContractBasicsStep";
import { ContractPricingStep } from "./ContractPricingStep";
import { ContractScheduleStep } from "./ContractScheduleStep";
import { ContractClausesStep } from "./ContractClausesStep";
import { ContractReviewStep, type SendContext } from "./ContractReviewStep";
import type { Issue } from "@/lib/validation/issues";

export type BuilderBasics = {
  languageMode: "ar" | "en" | "bilingual";
  titleAr: string;
  titleEn: string;
  scopeAr: string;
  scopeEn: string;
  startDate: string;
  endDate: string;
  signingDeadline: string;
  paymentTermsDays: number;
  governingLawAr: string;
  governingLawEn: string;
  jurisdictionAr: string;
  jurisdictionEn: string;
  internalNotes: string;
  hasFees: boolean;
  currency: string;
  milestoneMode: "percent" | "fixed";
};

export type BuilderItem = {
  descriptionAr: string;
  descriptionEn: string;
  qtyMilli: number;
  unitPriceMinor: number;
};

export type BuilderMilestone = {
  titleAr: string;
  titleEn: string;
  percentBp: number | null;
  amountMinor: number | null;
  dueDate: string | null;
  triggerNoteAr: string | null;
  triggerNoteEn: string | null;
};

export type BuilderClause = {
  key: string | null;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

export type BuilderPreset = {
  mode: "percent" | "fixed";
  rows: {
    titleAr: string;
    titleEn: string;
    percentBp?: number;
    triggerNoteAr?: string;
    triggerNoteEn?: string;
  }[];
} | null;

export type BuilderDetail = {
  id: string;
  status: string;
  currency: string;
  hasFees: boolean;
  projectLabel: string;
  templateLabel: string;
  basics: BuilderBasics;
  items: BuilderItem[];
  milestones: BuilderMilestone[];
  clauses: BuilderClause[];
  discount: { type: "none" | "percent" | "fixed"; value: number };
  taxRateBp: number;
  preset: BuilderPreset;
};

const STEPS = ["basics", "pricing", "schedule", "clauses", "review"] as const;
type Step = (typeof STEPS)[number];

export function ContractBuilder({
  detail,
  issues,
  sendContext,
}: {
  detail: BuilderDetail;
  issues: Issue[];
  sendContext: SendContext;
}) {
  const t = useTranslations("contracts");
  const router = useRouter();
  const [step, setStep] = useState<Step>("basics");

  function refresh() {
    router.refresh();
  }

  const stepDisabled = (value: Step): boolean =>
    !detail.hasFees && (value === "pricing" || value === "schedule");

  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label={t("builder.steps")}
        className="sticky top-14 z-30 flex gap-1 overflow-x-auto border-b border-border bg-background/95 py-2 backdrop-blur"
      >
        {STEPS.map((value, index) => {
          const disabled = stepDisabled(value);
          const active = step === value;
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              aria-current={active ? "step" : undefined}
              onClick={() => setStep(value)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-md border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="tabular-nums" dir="ltr">{`${index + 1}`}</span>
              {t(`builder.step.${value}`)}
            </button>
          );
        })}
      </nav>

      {step === "basics" ? (
        <ContractBasicsStep
          id={detail.id}
          projectLabel={detail.projectLabel}
          templateLabel={detail.templateLabel}
          currency={detail.currency}
          initial={detail.basics}
          onSaved={refresh}
        />
      ) : null}
      {step === "pricing" ? (
        <ContractPricingStep
          id={detail.id}
          currency={detail.currency}
          initialItems={detail.items}
          initialDiscount={detail.discount}
          initialTaxRateBp={detail.taxRateBp}
          onSaved={refresh}
        />
      ) : null}
      {step === "schedule" ? (
        <ContractScheduleStep
          id={detail.id}
          currency={detail.currency}
          mode={detail.basics.milestoneMode}
          initial={detail.milestones}
          preset={detail.preset}
          onSaved={refresh}
        />
      ) : null}
      {step === "clauses" ? (
        <ContractClausesStep
          id={detail.id}
          initial={detail.clauses}
          hasFees={detail.hasFees}
          onSaved={refresh}
        />
      ) : null}
      {step === "review" ? (
        <ContractReviewStep
          id={detail.id}
          languageMode={detail.basics.languageMode}
          issues={issues}
          sendContext={sendContext}
          onJump={setStep}
        />
      ) : null}
    </div>
  );
}
