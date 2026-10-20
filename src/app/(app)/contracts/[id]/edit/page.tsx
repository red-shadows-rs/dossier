// Dossier - Contracts Id Edit Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Pencil } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const detail = getContractDetail(id);
    const c = detail.contract;
    const title = c.number || c.titleAr || c.titleEn || id;
    const t = await getTranslations("common");
    return { title: `${t("edit")} · ${title}` };
  } catch {
    return { title: "Dossier" };
  }
}
import { Button } from "@/components/ui/Button";
import { db, withDbInstance } from "@/db";
import { clients, projects, templates } from "@/db/schema";
import {
  ContractBuilder,
  type BuilderDetail,
} from "@/components/forms/ContractBuilder";
import type { SendContext } from "@/components/forms/ContractReviewStep";
import { AppError } from "@/lib/errors";
import { isLocale } from "@/lib/i18n";
import { assertCan } from "@/lib/permissions";
import { templateDefaultsSchema } from "@/lib/validation/template";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";
import { getContractDetail } from "@/server/services/contracts";
import { listCompanySigners } from "@/server/services/contracts-send";
import { validateContractForSend } from "@/server/services/contracts-validate";
import { getSettings } from "@/server/services/settings";

export default async function ContractEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  assertCan(user, "contracts.write");
  const isDemo = isDemoUser(user.email);
  const { id } = await params;

  return withDbInstance(isDemo, async () => {
    const t = await getTranslations("contracts");
    const tc = await getTranslations("common");

    let detail;
    try {
      detail = getContractDetail(id);
    } catch (error) {
      if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
      throw error;
    }

    if (detail.contract.status !== "draft") {
      redirect(`/contracts/${id}`);
    }

  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, detail.contract.projectId))
    .get();
  const client = project
    ? db.select().from(clients).where(eq(clients.id, project.clientId)).get()
    : undefined;
  const template = detail.contract.templateId
    ? db
        .select()
        .from(templates)
        .where(eq(templates.id, detail.contract.templateId))
        .get()
    : undefined;

  const defaults = template
    ? templateDefaultsSchema.parse(JSON.parse(template.defaultsJson))
    : null;

  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : "ar";

  const projectName = project
    ? (locale === "ar"
        ? project.nameAr || project.nameEn
        : project.nameEn || project.nameAr) ?? ""
    : "";
  const clientNameStr = client
    ? (locale === "ar"
        ? client.nameAr || client.nameEn
        : client.nameEn || client.nameAr) ?? ""
    : "";
  const templateName = template
    ? (locale === "ar"
        ? template.nameAr || template.nameEn
        : template.nameEn || template.nameAr) ?? ""
    : "-";

  const builderDetail: BuilderDetail = {
    id: detail.contract.id,
    status: detail.contract.status,
    currency: detail.contract.currency,
    hasFees: detail.contract.hasFees,
    projectLabel: project
      ? `${project.code} - ${projectName}${clientNameStr ? ` (${clientNameStr})` : ""}`
      : "-",
    templateLabel: templateName,
    basics: {
      languageMode: detail.contract.languageMode,
      titleAr: detail.contract.titleAr ?? "",
      titleEn: detail.contract.titleEn ?? "",
      scopeAr: detail.contract.scopeAr ?? "",
      scopeEn: detail.contract.scopeEn ?? "",
      startDate: detail.contract.startDate ?? "",
      endDate: detail.contract.endDate ?? "",
      signingDeadline: detail.contract.signingDeadline ?? "",
      paymentTermsDays: detail.contract.paymentTermsDays,
      governingLawAr: detail.contract.governingLawAr ?? "",
      governingLawEn: detail.contract.governingLawEn ?? "",
      jurisdictionAr: detail.contract.jurisdictionAr ?? "",
      jurisdictionEn: detail.contract.jurisdictionEn ?? "",
      internalNotes: detail.contract.internalNotes ?? "",
      hasFees: detail.contract.hasFees,
      currency: detail.contract.currency,
      milestoneMode: detail.contract.milestoneMode,
    },
    items: detail.items.map((item) => ({
      descriptionAr: item.descriptionAr ?? "",
      descriptionEn: item.descriptionEn ?? "",
      qtyMilli: item.qtyMilli,
      unitPriceMinor: item.unitPriceMinor,
    })),
    milestones: detail.milestones.map((m) => ({
      titleAr: m.titleAr,
      titleEn: m.titleEn,
      percentBp: m.percentBp,
      amountMinor:
        detail.contract.milestoneMode === "fixed" && m.totalMinor !== null
          ? m.totalMinor
          : m.amountMinor,
      dueDate: m.dueDate,
      triggerNoteAr: m.triggerNoteAr,
      triggerNoteEn: m.triggerNoteEn,
    })),
    clauses: detail.clauses.map((clause) => ({
      key: clause.key,
      titleAr: clause.titleAr,
      titleEn: clause.titleEn,
      bodyAr: clause.bodyAr,
      bodyEn: clause.bodyEn,
    })),
    discount: {
      type: detail.contract.discountType,
      value: detail.contract.discountValue,
    },
    taxRateBp: detail.contract.taxRateBp,
    netMinor: detail.contract.netMinor,
    totalMinor: detail.contract.totalMinor,
    preset: defaults?.milestonePreset ?? null,
  };

  const signing = getSettings("signing");
  const clientRow = client;
  const clientName =
    (locale === "ar"
      ? clientRow?.repNameAr || clientRow?.repNameEn
      : clientRow?.repNameEn || clientRow?.repNameAr) ??
    clientRow?.nameAr ??
    clientRow?.nameEn ??
    "";
  const clientTitle =
    (locale === "ar" ? clientRow?.repTitleAr : clientRow?.repTitleEn) ||
    (clientRow?.type === "individual"
      ? (locale === "ar" ? "العميل" : "Client")
      : "");
  const signers = listCompanySigners().map((signer) => ({
    id: signer.id,
    name: signer.name,
    titleAr: signer.titleAr,
    titleEn: signer.titleEn,
    isSelf: signer.id === user.id,
  }));
  const sendContext: SendContext = {
    signers,
    clientDefaults: {
      name: clientName,
      title: clientTitle,
      email: clientRow?.email ?? "",
    },
    consentText:
      locale === "ar" ? signing.consentTextAr : signing.consentTextEn,
    requireProviderSignature: signing.requireProviderSignatureBeforeSend,
  };

  const contractDisplayTitle =
    detail.contract.number ?? (builderDetail.basics.titleAr || builderDetail.basics.titleEn);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href="/contracts"
            className="hover:text-foreground transition-colors"
          >
            {t("title")}
          </Link>
          <span className="text-border">/</span>
          <Link
            href={`/contracts/${id}`}
            className="hover:text-foreground transition-colors font-mono truncate max-w-[200px]"
          >
            {contractDisplayTitle}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium">{tc("edit")}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <Pencil size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {builderDetail.basics.titleAr || builderDetail.basics.titleEn}
                </h1>
                {detail.contract.number ? (
                  <span className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground translate-y-0.5" dir="ltr">
                    {detail.contract.number}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/contracts/${id}`}>
              <Button type="button" variant="secondary" size="sm" className="gap-1.5 font-medium shadow-xs">
                <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
                <span>{locale === "ar" ? "العودة للعقد" : "Back to contract"}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <ContractBuilder
        detail={builderDetail}
        issues={validateContractForSend(id)}
        sendContext={sendContext}
      />
    </div>
    );
  });
}
