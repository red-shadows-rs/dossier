-- Custom SQL migration file, put your code below! --
-- invoice & payment integrity triggers (DOSSIER_PLAN.md 6.3)
-- payments are never deleted and their core columns are immutable
CREATE TRIGGER payments_no_delete BEFORE DELETE ON payments BEGIN SELECT RAISE(ABORT, 'payments cannot be deleted; void them'); END;
--> statement-breakpoint
CREATE TRIGGER payments_core_immutable BEFORE UPDATE OF amount_minor, invoice_id, paid_on, method, reference ON payments BEGIN SELECT RAISE(ABORT, 'payments are immutable; void and re-enter'); END;
--> statement-breakpoint
-- numbered / non-draft invoices cannot be deleted
CREATE TRIGGER invoices_no_delete_issued BEFORE DELETE ON invoices WHEN OLD.number IS NOT NULL OR OLD.status <> 'draft' BEGIN SELECT RAISE(ABORT, 'issued invoices cannot be deleted'); END;
--> statement-breakpoint
-- issued invoices: money/identity columns frozen
CREATE TRIGGER invoices_issued_immutable BEFORE UPDATE OF number, client_id, project_id, contract_id, milestone_id, currency, issue_date, due_date, discount_type, discount_value, subtotal_minor, discount_minor, net_minor, tax_rate_bp, tax_minor, total_minor, seller_snapshot_json, buyer_snapshot_json ON invoices
  WHEN OLD.status <> 'draft' BEGIN SELECT RAISE(ABORT, 'issued invoices are immutable'); END;
--> statement-breakpoint
-- invoice lines are editable only while the parent is a draft
CREATE TRIGGER invoice_lines_draft_ins BEFORE INSERT ON invoice_lines WHEN (SELECT status FROM invoices WHERE id = NEW.invoice_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'invoice is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER invoice_lines_draft_upd BEFORE UPDATE ON invoice_lines WHEN (SELECT status FROM invoices WHERE id = OLD.invoice_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'invoice is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER invoice_lines_draft_del BEFORE DELETE ON invoice_lines WHEN (SELECT status FROM invoices WHERE id = OLD.invoice_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'invoice is not editable'); END;
