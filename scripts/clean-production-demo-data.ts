// Dossier - Clean Production Demo Data Script
// https://github.com/red-shadows-rs/dossier

import { and, eq, inArray } from "drizzle-orm";
import { db, sqlite, withTx } from "@/db";
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
  sessions,
  users,
} from "@/db/schema";

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

const DEMO_CLIENT_EMAILS = [
  "contact@elite-tech.example",
  "info@alufuq.example",
  "hello@reg.example",
  "client1@sample-domain.example",
  "client2@sample-domain.example",
  "client3@sample-domain.example",
  "client4@sample-domain.example",
];

async function main() {
  console.log("Cleaning demo data from production database...");

  const demoUser = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "demo@red-shadows-rs.com"))
    .get();

  if (demoUser) {
    db.delete(sessions).where(eq(sessions.userId, demoUser.id)).run();
    db.delete(users).where(eq(users.id, demoUser.id)).run();
    console.log("Deleted demo user and sessions.");
  }

  const demoClients = db
    .select({ id: clients.id })
    .from(clients)
    .where(inArray(clients.email, DEMO_CLIENT_EMAILS))
    .all();

  const demoClientIds = demoClients.map((c) => c.id);

  if (demoClientIds.length > 0) {
    const demoProjects = db
      .select({ id: projects.id })
      .from(projects)
      .where(inArray(projects.clientId, demoClientIds))
      .all();
    const demoProjectIds = demoProjects.map((p) => p.id);

    sqlite.exec(DROP_INTEGRITY_TRIGGERS);
    try {
      withTx((tx) => {
        if (demoProjectIds.length > 0) {
          const demoInvoices = tx
            .select({ id: invoices.id })
            .from(invoices)
            .where(inArray(invoices.projectId, demoProjectIds))
            .all();
          const demoInvoiceIds = demoInvoices.map((i) => i.id);

          if (demoInvoiceIds.length > 0) {
            tx.delete(payments)
              .where(inArray(payments.invoiceId, demoInvoiceIds))
              .run();
            tx.delete(invoiceLines)
              .where(inArray(invoiceLines.invoiceId, demoInvoiceIds))
              .run();
            tx.delete(invoices)
              .where(inArray(invoices.id, demoInvoiceIds))
              .run();
          }

          const demoContracts = tx
            .select({ id: contracts.id })
            .from(contracts)
            .where(inArray(contracts.projectId, demoProjectIds))
            .all();
          const demoContractIds = demoContracts.map((c) => c.id);

          if (demoContractIds.length > 0) {
            tx.delete(paymentMilestones)
              .where(inArray(paymentMilestones.contractId, demoContractIds))
              .run();
            tx.delete(contractSignatories)
              .where(inArray(contractSignatories.contractId, demoContractIds))
              .run();
            tx.delete(contractClauses)
              .where(inArray(contractClauses.contractId, demoContractIds))
              .run();
            tx.delete(contractItems)
              .where(inArray(contractItems.contractId, demoContractIds))
              .run();
            tx.delete(contractVersions)
              .where(inArray(contractVersions.contractId, demoContractIds))
              .run();
            tx.delete(contracts)
              .where(inArray(contracts.id, demoContractIds))
              .run();
          }

          tx.delete(projects)
            .where(inArray(projects.id, demoProjectIds))
            .run();
        }

        tx.delete(clients)
          .where(inArray(clients.id, demoClientIds))
          .run();
      });
    } finally {
      sqlite.exec(RESTORE_INTEGRITY_TRIGGERS);
    }
    console.log(`Cleaned ${demoClientIds.length} demo clients and related records.`);
  }

  console.log("Production database clean complete.");
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});

