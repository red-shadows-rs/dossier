// Dossier - Demo Service Module
// https://github.com/red-shadows-rs/dossier

import { and, count, eq } from "drizzle-orm";
import { db, getDemoInstance, sqlite, withDbInstance, withTx } from "@/db";
import {
  clients,
  contractClauses,
  contractItems,
  contractSignatories,
  contractVersions,
  contracts,
  invoiceLines,
  invoices,
  paymentMilestones,
  payments,
  projects,
  settings,
  templates,
  users,
} from "@/db/schema";
import { addDays, nowMs, todayInTz } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { hashPassword } from "@/server/auth/password";
import {
  createDemoSession,
  type RequestMeta,
  type SessionUser,
} from "@/server/auth/session";
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
import { getSettings } from "@/server/services/settings";
import { seedSystemTemplates } from "@/server/services/templates";
import { createContractFromTemplate } from "@/server/services/contracts";

export const DEMO_USER_EMAIL = "demo@red-shadows-rs.com";

const DEMO_CLIENTS = [
  {
    nameAr: "شركة السحاب المتطورة المحدودة",
    nameEn: "Advanced Cloud Co. Ltd.",
    city: "الرياض",
    email: "client1@sample-domain.example",
    phone: "+966501112233",
  },
  {
    nameAr: "مؤسسة البناء الرقمي للتجارة",
    nameEn: "Digital Build Est.",
    city: "جدة",
    email: "client2@sample-domain.example",
    phone: "+966502223344",
  },
  {
    nameAr: "مجموعة القمة للاستشارات",
    nameEn: "Summit Consulting Group",
    city: "الدمام",
    email: "client3@sample-domain.example",
    phone: "+966503334455",
  },
  {
    nameAr: "وكالة المدى الإبداعية",
    nameEn: "Al-Mada Creative Agency",
    city: "الخبر",
    email: "client4@sample-domain.example",
    phone: "+966504445566",
  },
];

const DEMO_PROJECTS = [
  {
    nameAr: "تطوير البوابة السحابية الموحدة",
    nameEn: "Unified Cloud Portal Development",
    status: "active" as const,
  },
  {
    nameAr: "تصميم وتطوير تطبيق الهواتف الذكية",
    nameEn: "Mobile Application Design & Build",
    status: "active" as const,
  },
  {
    nameAr: "نظام إدارة الوثائق والمستندات",
    nameEn: "Document Management System",
    status: "completed" as const,
  },
];

const DEMO_INVOICES = [
  {
    line: "المرحلة الأولى: التحليل وبناء الهيكل السحابي",
    amountMinor: 12_500_000,
    issue: true,
    pay: 12_500_000,
    overdue: false,
  },
  {
    line: "المرحلة الثانية: تطوير واجهات المستخدم والتكامل",
    amountMinor: 8_000_000,
    issue: true,
    pay: 4_000_000,
    overdue: false,
  },
  {
    line: "المرحلة الثالثة: الاختبارات الأمنية ومراجعة الجودة",
    amountMinor: 5_500_000,
    issue: true,
    pay: 0,
    overdue: true,
  },
  {
    line: "المرحلة الرابعة: إطلاق النسخة التجريبية والتدريب",
    amountMinor: 15_000_000,
    issue: false,
    pay: 0,
    overdue: false,
  },
];

export function isDemoUser(email: string | null | undefined): boolean {
  return email?.toLowerCase() === DEMO_USER_EMAIL;
}

export async function getOrCreateDemoUser(): Promise<SessionUser> {
  return withDbInstance(true, async () => {
    const existing = db
      .select()
      .from(users)
      .where(eq(users.email, DEMO_USER_EMAIL))
      .get();

    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
        locale: existing.locale,
        canSignForCompany: existing.canSignForCompany,
        signerTitleAr: existing.signerTitleAr,
        signerTitleEn: existing.signerTitleEn,
      };
    }

    const id = newId();
    const now = nowMs();
    const passwordHash = await hashPassword("Demo-Session-2026!");

    db.insert(users)
      .values({
        id,
        email: DEMO_USER_EMAIL,
        name: "مدير تجريبي (RED SHADOWS | RS)",
        passwordHash,
        role: "member",
        locale: "ar",
        status: "active",
        canSignForCompany: true,
        signerTitleAr: "مدير تجريبي مفوض",
        signerTitleEn: "Authorized Demo Manager",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return {
      id,
      email: DEMO_USER_EMAIL,
      name: "مدير تجريبي (RED SHADOWS | RS)",
      role: "member",
      locale: "ar",
      canSignForCompany: true,
      signerTitleAr: "مدير تجريبي مفوض",
      signerTitleEn: "Authorized Demo Manager",
    };
  });
}

export function seedDemoData(user: SessionUser, meta: RequestMeta): void {
  withDbInstance(true, () => {
    seedSystemTemplates();

  const currentCompany = getSettings("company");
  if (!currentCompany.nameAr || !currentCompany.nameEn) {
    const demoCompany = {
      nameAr: "مؤسسة الأفق الذكي لتقنية المعلومات",
      nameEn: "Smart Horizon IT Solutions",
      legalNameAr: "مؤسسة الأفق الذكي للحلول البرمجية",
      legalNameEn: "Smart Horizon Software Solutions LLC",
      crNumber: "1010999999",
      taxNumber: "300099999900003",
      addressAr: "الرياض، المملكة العربية السعودية",
      addressEn: "Riyadh, Saudi Arabia",
      email: "contact@smart-horizon.example",
      phone: "+966112223333",
      website: "https://dossier.red-shadows-rs.com",
      bank: {
        bankNameAr: "البنك الأهلي السعودي",
        bankNameEn: "Saudi National Bank",
        accountHolder: "Smart Horizon IT Solutions",
        iban: "SA0000000000000000000000",
        swift: "NCBKSARI",
      },
    };
    db.insert(settings)
      .values({
        key: "company",
        valueJson: JSON.stringify(demoCompany),
        updatedAt: nowMs(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          valueJson: JSON.stringify(demoCompany),
          updatedAt: nowMs(),
        },
      })
      .run();
  }

  const today = todayInTz(getSettings("defaults").timezone);
  const clientIds: string[] = [];

  for (const client of DEMO_CLIENTS) {
    const existing = db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.email, client.email))
      .get();
    if (existing) {
      clientIds.push(existing.id);
    } else {
      clientIds.push(createClient(user, clientInputSchema.parse(client), meta));
    }
  }

  const projectIds: string[] = [];
  DEMO_PROJECTS.forEach((project, index) => {
    const clientId = clientIds[index % clientIds.length];
    const existing = db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.clientId, clientId), eq(projects.nameAr, project.nameAr)),
      )
      .get();
    if (existing) {
      projectIds.push(existing.id);
    } else {
      const created = createProject(
        user,
        projectInputSchema.parse({
          clientId,
          nameAr: project.nameAr,
          nameEn: project.nameEn,
          status: project.status,
          currency: "SAR",
        }),
        meta,
      );
      projectIds.push(created.id);
    }
  });

  const existingInvoicesCount =
    db.select({ value: count() }).from(invoices).get()?.value ?? 0;

  if (existingInvoicesCount < DEMO_INVOICES.length && projectIds.length > 0) {
    DEMO_INVOICES.forEach((inv, index) => {
      const projectId = projectIds[index % projectIds.length];
      const invId = createInvoice(
        user,
        createInvoiceSchema.parse({
          projectId,
          languageMode: "ar",
          notesAr: null,
          notesEn: null,
        }),
        meta,
      );
      saveInvoiceLines(
        user,
        invId,
        saveInvoiceLinesSchema.parse({
          lines: [
            {
              descriptionAr: inv.line,
              descriptionEn: inv.line,
              qtyMilli: 1000,
              unitPriceMinor: inv.amountMinor,
            },
          ],
          discount: { type: "none", value: 0 },
          taxRateBp: 1500,
        }),
        meta,
      );
      const dueDate = inv.overdue ? addDays(today, -5) : addDays(today, 14);
      updateInvoiceDraft(
        user,
        invId,
        updateInvoiceDraftSchema.parse({
          languageMode: "ar",
          issueDate: inv.issue ? (inv.overdue ? addDays(today, -20) : today) : null,
          dueDate: inv.issue ? dueDate : null,
          notesAr: null,
          notesEn: null,
        }),
        meta,
      );
      if (inv.issue) {
        issueInvoice(user, invId, meta);
      }
      if (inv.pay > 0) {
        recordPayment(
          user,
          invId,
          recordPaymentSchema.parse({
            amountMinor: inv.pay,
            paidOn: today,
            method: "bank_transfer",
            reference: `DEMO-PAY-${1000 + index}`,
          }),
          meta,
        );
      }
    });
  }

  const existingContractsCount =
    db.select({ value: count() }).from(contracts).get()?.value ?? 0;

  if (existingContractsCount === 0 && projectIds.length > 0) {
    const defaultTemplate = db.select().from(templates).get();
    if (defaultTemplate) {
      try {
        createContractFromTemplate(
          user,
          {
            projectId: projectIds[0],
            templateId: defaultTemplate.id,
          },
          meta,
        );
      } catch {
      }
    }
  }
  });
}

const DROP_INTEGRITY_TRIGGERS = `
DROP TRIGGER IF EXISTS payments_no_delete;
DROP TRIGGER IF EXISTS invoices_no_delete_issued;
DROP TRIGGER IF EXISTS invoice_lines_draft_del;
DROP TRIGGER IF EXISTS signatories_no_delete;
DROP TRIGGER IF EXISTS contracts_no_delete_sent;
DROP TRIGGER IF EXISTS contract_versions_no_delete;
DROP TRIGGER IF EXISTS contract_clauses_draft_del;
DROP TRIGGER IF EXISTS contract_items_draft_del;
DROP TRIGGER IF EXISTS milestones_draft_del;
`;

const RESTORE_INTEGRITY_TRIGGERS = `
CREATE TRIGGER IF NOT EXISTS payments_no_delete BEFORE DELETE ON payments BEGIN SELECT RAISE(ABORT, 'payments cannot be deleted; void them'); END;
CREATE TRIGGER IF NOT EXISTS invoices_no_delete_issued BEFORE DELETE ON invoices WHEN OLD.number IS NOT NULL OR OLD.status <> 'draft' BEGIN SELECT RAISE(ABORT, 'issued invoices cannot be deleted'); END;
CREATE TRIGGER IF NOT EXISTS invoice_lines_draft_del BEFORE DELETE ON invoice_lines WHEN (SELECT status FROM invoices WHERE id = OLD.invoice_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'invoice is not editable'); END;
CREATE TRIGGER IF NOT EXISTS signatories_no_delete BEFORE DELETE ON contract_signatories BEGIN SELECT RAISE(ABORT, 'signatories cannot be deleted'); END;
CREATE TRIGGER IF NOT EXISTS contracts_no_delete_sent BEFORE DELETE ON contracts WHEN OLD.number IS NOT NULL OR OLD.status <> 'draft' BEGIN SELECT RAISE(ABORT, 'sent contracts cannot be deleted'); END;
CREATE TRIGGER IF NOT EXISTS contract_versions_no_delete BEFORE DELETE ON contract_versions BEGIN SELECT RAISE(ABORT, 'contract_versions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS contract_clauses_draft_del BEFORE DELETE ON contract_clauses WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
CREATE TRIGGER IF NOT EXISTS contract_items_draft_del BEFORE DELETE ON contract_items WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
CREATE TRIGGER IF NOT EXISTS milestones_draft_del BEFORE DELETE ON payment_milestones WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
`;

export function resetDemoData(user: SessionUser, meta: RequestMeta): void {
  withDbInstance(true, () => {
    sqlite.exec(DROP_INTEGRITY_TRIGGERS);
    try {
      withTx((tx) => {
        tx.delete(payments).run();
        tx.delete(invoiceLines).run();
        tx.delete(invoices).run();
        tx.delete(paymentMilestones).run();
        tx.delete(contractSignatories).run();
        tx.delete(contractClauses).run();
        tx.delete(contractItems).run();
        tx.delete(contractVersions).run();
        tx.delete(contracts).run();
        tx.delete(projects).run();
        tx.delete(clients).run();
      });
    } finally {
      sqlite.exec(RESTORE_INTEGRITY_TRIGGERS);
    }
    seedDemoData(user, meta);
  });
}

export async function loginAsDemo(meta: RequestMeta): Promise<string> {
  getDemoInstance();
  return withDbInstance(true, async () => {
    const user = await getOrCreateDemoUser();
    seedDemoData(user, meta);
    return withTx((tx) => createDemoSession(tx, user.id, meta));
  });
}
