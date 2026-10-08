-- Custom SQL migration file, put your code below! --
-- contract integrity triggers (DOSSIER_PLAN.md 6.3)
-- immutable contract versions
CREATE TRIGGER contract_versions_no_update BEFORE UPDATE ON contract_versions BEGIN SELECT RAISE(ABORT, 'contract_versions are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER contract_versions_no_delete BEFORE DELETE ON contract_versions BEGIN SELECT RAISE(ABORT, 'contract_versions are immutable'); END;
--> statement-breakpoint
-- signatories are never deleted
CREATE TRIGGER signatories_no_delete BEFORE DELETE ON contract_signatories BEGIN SELECT RAISE(ABORT, 'signatories cannot be deleted'); END;
--> statement-breakpoint
-- numbered / non-draft contracts cannot be deleted
CREATE TRIGGER contracts_no_delete_sent BEFORE DELETE ON contracts WHEN OLD.number IS NOT NULL OR OLD.status <> 'draft' BEGIN SELECT RAISE(ABORT, 'sent contracts cannot be deleted'); END;
--> statement-breakpoint
-- signed contracts: content columns frozen
CREATE TRIGGER contracts_signed_immutable BEFORE UPDATE OF number, client_id, project_id, language_mode, has_fees, title_ar, title_en, scope_ar, scope_en, currency, discount_type, discount_value, subtotal_minor, discount_minor, net_minor, tax_rate_bp, tax_minor, total_minor, milestone_mode, start_date, end_date, content_hash ON contracts
  WHEN OLD.status IN ('signed', 'completed', 'terminated') BEGIN SELECT RAISE(ABORT, 'signed contracts are immutable'); END;
--> statement-breakpoint
-- contract children are editable only while the parent is a draft
CREATE TRIGGER contract_clauses_draft_ins BEFORE INSERT ON contract_clauses WHEN (SELECT status FROM contracts WHERE id = NEW.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER contract_clauses_draft_upd BEFORE UPDATE ON contract_clauses WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER contract_clauses_draft_del BEFORE DELETE ON contract_clauses WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER contract_items_draft_ins BEFORE INSERT ON contract_items WHEN (SELECT status FROM contracts WHERE id = NEW.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER contract_items_draft_upd BEFORE UPDATE ON contract_items WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER contract_items_draft_del BEFORE DELETE ON contract_items WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER milestones_draft_ins BEFORE INSERT ON payment_milestones WHEN (SELECT status FROM contracts WHERE id = NEW.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER milestones_draft_upd BEFORE UPDATE ON payment_milestones WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER milestones_draft_del BEFORE DELETE ON payment_milestones WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
