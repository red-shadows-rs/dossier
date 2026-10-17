"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarClock,
  CheckCircle2,
  Receipt,
  ScrollText,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import { ContractBasicsStep } from "./ContractBasicsStep";
import { ContractPricingStep } from "./ContractPricingStep";
import { ContractScheduleStep } from "./ContractScheduleStep";
import { ContractClausesStep } from "./ContractClausesStep";
import { ContractReviewStep, type SendContext } from "./ContractReviewStep";
import type { Issue } from "@/lib/validation/issues";

export type BuilderBasics = {
  languageMode: "ar" | "en";
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
  netMinor?: number;
  totalMinor?: number;
  preset: BuilderPreset;
};

const STEPS = ["basics", "pricing", "schedule", "clauses", "review"] as const;
type Step = (typeof STEPS)[number];

const STEP_ICONS = {
  basics: SlidersHorizontal,
  pricing: Receipt,
  schedule: CalendarClock,
  clauses: ScrollText,
  review: Send,
} as const;

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

  useEffect(() => {
    const el = document.getElementById(`step-btn-${step}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [step]);

  function refresh() {
    router.refresh();
  }

  const stepDisabled = (value: Step): boolean =>
    !detail.hasFees && (value === "pricing" || value === "schedule");

  // Navigation handlers
  function goNextFromBasics() {
    setStep(detail.hasFees ? "pricing" : "clauses");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrevFromPricing() {
    setStep("basics");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNextFromPricing() {
    setStep("schedule");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrevFromSchedule() {
    setStep("pricing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNextFromSchedule() {
    setStep("clauses");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrevFromClauses() {
    setStep(detail.hasFees ? "schedule" : "basics");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNextFromClauses() {
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrevFromReview() {
    setStep("clauses");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const currentIndex = STEPS.indexOf(step);

  return (
    <div className="flex flex-col gap-6">
      {/* Sleek Dossier Step Navigation */}
      <div className="relative sm:sticky sm:top-14 z-20 rounded border border-border bg-card p-1 shadow-xs">
        <nav
          aria-label={t("builder.steps")}
          className="flex items-center gap-1 overflow-x-auto touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-1.5"
        >
          {STEPS.map((value, index) => {
            const disabled = stepDisabled(value);
            const active = step === value;
            const completed = !disabled && index < currentIndex;
            const Icon = STEP_ICONS[value];

            return (
              <button
                key={value}
                id={`step-btn-${value}`}
                type="button"
                disabled={disabled}
                aria-current={active ? "step" : undefined}
                onClick={() => {
                  setStep(value);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded px-2.5 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer sm:px-3 sm:py-2 sm:text-sm",
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : completed
                      ? "text-foreground hover:bg-muted/60"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  disabled &&
                    "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground",
                )}
              >
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold shrink-0",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : completed
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </div>

                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn(active ? "inline" : "hidden sm:inline")}>
                  {t(`builder.step.${value}`)}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Step Content */}
      {step === "basics" ? (
        <ContractBasicsStep
          id={detail.id}
          projectLabel={detail.projectLabel}
          templateLabel={detail.templateLabel}
          currency={detail.currency}
          initial={detail.basics}
          onSaved={refresh}
          onNext={goNextFromBasics}
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
          onPrev={goPrevFromPricing}
          onNext={goNextFromPricing}
        />
      ) : null}
      {step === "schedule" ? (
        <ContractScheduleStep
          id={detail.id}
          currency={detail.currency}
          mode={detail.basics.milestoneMode}
          initial={detail.milestones}
          preset={detail.preset}
          netMinor={detail.netMinor}
          totalMinor={detail.totalMinor}
          onSaved={refresh}
          onPrev={goPrevFromSchedule}
          onNext={goNextFromSchedule}
        />
      ) : null}
      {step === "clauses" ? (
        <ContractClausesStep
          id={detail.id}
          initial={detail.clauses}
          hasFees={detail.hasFees}
          onSaved={refresh}
          onPrev={goPrevFromClauses}
          onNext={goNextFromClauses}
        />
      ) : null}
      {step === "review" ? (
        <ContractReviewStep
          id={detail.id}
          languageMode={detail.basics.languageMode}
          issues={issues}
          sendContext={sendContext}
          onJump={setStep}
          onPrev={goPrevFromReview}
        />
      ) : null}
    </div>
  );
}

