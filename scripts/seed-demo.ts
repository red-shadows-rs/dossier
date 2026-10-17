import { count } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices, projects, users } from "@/db/schema";
import { addDays, todayInTz } from "@/lib/dates";
import { clientInputSchema } from "@/lib/validation/clients";
import { projectInputSchema } from "@/lib/validation/projects";
import {
  createInvoiceSchema,
  recordPaymentSchema,
  saveInvoiceLinesSchema,
  updateInvoiceDraftSchema,
} from "@/lib/validation/invoices";
import { createClient } from "@/server/services/clients";
import {
  createInvoice,
  issueInvoice,
  saveInvoiceLines,
  updateInvoiceDraft,
} from "@/server/services/invoices";
import { recordPayment } from "@/server/services/payments";
import { createProject } from "@/server/services/projects";
import { getSettings, updateSettings } from "@/server/services/settings";
import type { RequestMeta, SessionUser } from "@/server/auth/session";

const meta: RequestMeta = { ip: "127.0.0.1", userAgent: "seed-demo" };

function owner(): SessionUser {
  const row = db.select().from(users).get();
  if (!row) {
    throw new Error("No user found. Run `npm run seed` first.");
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    locale: row.locale,
    canSignForCompany: row.canSignForCompany,
    signerTitleAr: row.signerTitleAr,
    signerTitleEn: row.signerTitleEn,
  };
}

const CLIENTS = [
  {
    nameAr: "شركة النخبة للتقنية",
    nameEn: "Elite Tech Co.",
    city: "الرياض",
    email: "contact@elite-tech.example",
    phone: "+966500000001",
  },
  {
    nameAr: "مؤسسة الأفق التجارية",
    nameEn: "Al Ufuq Trading",
    city: "جدة",
    email: "info@alufuq.example",
    phone: "+966500000002",
  },
  {
    nameAr: "مجموعة الرياض الهندسية",
    nameEn: "Riyadh Engineering Group",
    city: "الرياض",
    email: "hello@reg.example",
    phone: "+966500000003",
  },
  {
    nameAr: "شركة البحر الأحمر العقارية",
    nameEn: "Red Sea Realty",
    city: "جدة",
    email: "sales@redsea.example",
    phone: "+966500000004",
  },
  {
    nameAr: "مستشفى السلام الطبي",
    nameEn: "Salam Medical",
    city: "الدمام",
    email: "admin@salam-med.example",
    phone: "+966500000005",
  },
  {
    nameAr: "شركة واحة التقنية",
    nameEn: "Oasis Tech",
    city: "الخبر",
    email: "team@oasis-tech.example",
    phone: "+966500000006",
  },
];

const PROJECTS = [
  { nameAr: "منصة التجارة الإلكترونية", nameEn: "E-commerce Platform", status: "active" },
  { nameAr: "إعادة تصميم الموقع", nameEn: "Website Redesign", status: "active" },
  { nameAr: "نظام موارد المؤسسة ERP", nameEn: "ERP System", status: "on_hold" },
  { nameAr: "تطبيق الجوال", nameEn: "Mobile App", status: "completed" },
  { nameAr: "حملة تسويق رقمي", nameEn: "Digital Campaign", status: "lead" },
];

const INVOICES = [
  { line: "تطوير المرحلة الأولى", amountMinor: 4_500_000, issue: true, pay: 4_500_000 },
  { line: "تصميم واجهات المستخدم", amountMinor: 2_800_000, issue: true, pay: 1_400_000 },
  { line: "استشارات تقنية", amountMinor: 1_200_000, issue: true, pay: 0 },
  { line: "صيانة سنوية", amountMinor: 900_000, issue: false, pay: 0 },
  { line: "تدريب الفريق", amountMinor: 1_500_000, issue: false, pay: 0 },
];

async function main(): Promise<void> {
  const user = owner();
  const today = todayInTz(getSettings("defaults").timezone);

  updateSettings(
    "company",
    {
      nameAr: "مؤسسة دوسييه",
      nameEn: "Dossier Studio",
      legalNameAr: "مؤسسة دوسييه للتقنية",
      legalNameEn: "Dossier Studio LLC",
      crNumber: "1010000000",
      taxNumber: "300000000000003",
      addressAr: "الرياض، المملكة العربية السعودية",
      addressEn: "Riyadh, Saudi Arabia",
      email: "billing@dossier.example",
      phone: "+966110000000",
      website: "https://dossier.example",
      bank: {
        bankNameAr: "البنك الأهلي",
        bankNameEn: "National Bank",
        accountHolder: "Dossier Studio",
        iban: "SA0000000000000000000000",
        swift: "NBOKSAJE",
      },
    },
    user,
    meta,
  );
  console.log("Company settings set.");

  const existingClients = db
    .select({ id: clients.id })
    .from(clients)
    .all()
    .map((row) => row.id);
  const clientIds = existingClients;
  if (clientIds.length === 0) {
    for (const client of CLIENTS) {
      clientIds.push(createClient(user, clientInputSchema.parse(client), meta));
    }
  }
  console.log(`Clients available: ${clientIds.length}`);

  const projectIds = db
    .select({ id: projects.id })
    .from(projects)
    .all()
    .map((row) => row.id);
  if (projectIds.length === 0) {
    PROJECTS.forEach((project, index) => {
      const result = createProject(
        user,
        projectInputSchema.parse({
          clientId: clientIds[index % clientIds.length],
          nameAr: project.nameAr,
          nameEn: project.nameEn,
          status: project.status,
          currency: "SAR",
        }),
        meta,
      );
      projectIds.push(result.id);
    });
  }
  console.log(`Projects available: ${projectIds.length}`);

  const existingInvoices =
    db.select({ value: count() }).from(invoices).get()?.value ?? 0;
  if (existingInvoices >= INVOICES.length) {
    console.log("Invoices already seeded; nothing to do.");
    return;
  }

  let issued = 0;
  let paid = 0;
  INVOICES.forEach((invoice, index) => {
    const id = createInvoice(
      user,
      createInvoiceSchema.parse({
        projectId: projectIds[index % projectIds.length],
        languageMode: "ar",
        notesAr: null,
        notesEn: null,
      }),
      meta,
    );
    saveInvoiceLines(
      user,
      id,
      saveInvoiceLinesSchema.parse({
        lines: [
          {
            descriptionAr: invoice.line,
            descriptionEn: invoice.line,
            qtyMilli: 1000,
            unitPriceMinor: invoice.amountMinor,
          },
        ],
        discount: { type: "none", value: 0 },
        taxRateBp: 1500,
      }),
      meta,
    );
    updateInvoiceDraft(
      user,
      id,
      updateInvoiceDraftSchema.parse({
        languageMode: "ar",
        issueDate: invoice.issue ? today : null,
        dueDate: invoice.issue ? addDays(today, 14) : null,
        notesAr: null,
        notesEn: null,
      }),
      meta,
    );
    if (invoice.issue) {
      issueInvoice(user, id, meta);
      issued += 1;
    }
    if (invoice.pay > 0) {
      recordPayment(
        user,
        id,
        recordPaymentSchema.parse({
          amountMinor: invoice.pay,
          paidOn: today,
          method: "bank_transfer",
          reference: `TRX-${1000 + index}`,
        }),
        meta,
      );
      paid += 1;
    }
  });
  console.log(`Invoices created: ${INVOICES.length} (issued ${issued}, paid ${paid})`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});