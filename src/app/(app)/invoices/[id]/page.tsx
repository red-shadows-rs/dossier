// Dossier - Invoices Id Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { InvoiceDetailView } from "@/components/forms/InvoiceDetailView";
import { todayInTz } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getInvoiceDetail, isOverdue } from "@/server/services/invoices";
import { listPayments } from "@/server/services/payments";
import {
  buildPaymentInstructions,
  getSettings,
} from "@/server/services/settings";
import { smoothLoading } from "@/lib/smooth-loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const detail = getInvoiceDetail(id);
    return { title: detail.invoice.number || id };
  } catch {
    return { title: "Dossier" };
  }
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const rawLocale = await getLocale();
  const locale = rawLocale === "en" ? "en" : "ar";
  const { id } = await params;

  let detail;
  try {
    detail = getInvoiceDetail(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { invoice, lines } = detail;
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, invoice.projectId))
    .get();
  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, invoice.clientId))
    .get();
  const payments = listPayments(id);
  const today = todayInTz(getSettings("defaults").timezone);
  const overdue = isOverdue(invoice, today);
  const company = getSettings("company");
  const fallbackInstructions = buildPaymentInstructions(company, locale);
  const paymentInstructions =
    (locale === "ar"
      ? invoice.paymentInstructionsAr || invoice.paymentInstructionsEn
      : invoice.paymentInstructionsEn || invoice.paymentInstructionsAr) ||
    fallbackInstructions;

  return (
    <InvoiceDetailView
      invoice={invoice}
      lines={lines}
      payments={payments}
      project={project}
      client={client}
      canWrite={can(user, "invoices.write")}
      canIssue={can(user, "invoices.issue")}
      canVoid={can(user, "invoices.void")}
      canPay={can(user, "payments.write")}
      canRead={can(user, "invoices.read")}
      canVoidPayment={can(user, "payments.void")}
      paymentInstructions={paymentInstructions}
      overdue={overdue}
      locale={locale}
    />
  );
}
