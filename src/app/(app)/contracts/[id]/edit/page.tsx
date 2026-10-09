import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { db } from "@/db";
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
  const { id } = await params;

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

  const builderDetail: BuilderDetail = {
    id: detail.contract.id,
    status: detail.contract.status,
    currency: detail.contract.currency,
    hasFees: detail.contract.hasFees,
    projectLabel: project
      ? `${project.code} — ${project.nameAr ?? project.nameEn ?? ""}${client ? ` (${client.nameAr ?? client.nameEn ?? ""})` : ""}`
      : "—",
    templateLabel: template ? `${template.nameAr} / ${template.nameEn}` : "—",
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
      amountMinor: m.amountMinor,
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
    preset: defaults?.milestonePreset ?? null,
  };

  const signing = getSettings("signing");
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : "ar";
  const clientRow = client;
  const clientName =
    (locale === "ar"
      ? clientRow?.repNameAr || clientRow?.repNameEn
      : clientRow?.repNameEn || clientRow?.repNameAr) ??
    clientRow?.nameAr ??
    clientRow?.nameEn ??
    "";
  const clientTitle =
    (locale === "ar" ? clientRow?.repTitleAr : clientRow?.repTitleEn) ?? "";
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">
          {builderDetail.basics.titleAr || builderDetail.basics.titleEn}
        </h1>
        <span className="font-mono text-sm text-muted-foreground" dir="ltr">
          {detail.contract.number ?? ""}
        </span>
      </div>
      <ContractBuilder
        detail={builderDetail}
        issues={validateContractForSend(id)}
        sendContext={sendContext}
      />
    </div>
  );
}
