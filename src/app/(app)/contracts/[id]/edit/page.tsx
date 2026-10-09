import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, projects, templates } from "@/db/schema";
import {
  ContractBuilder,
  type BuilderDetail,
} from "@/components/forms/ContractBuilder";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import { templateDefaultsSchema } from "@/lib/validation/template";
import { requireUserPage } from "@/server/auth/require-user";
import { getContractDetail } from "@/server/services/contracts";
import { validateContractForSend } from "@/server/services/contracts-validate";

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
      />
    </div>
  );
}
