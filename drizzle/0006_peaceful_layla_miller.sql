CREATE TABLE `invoice_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`position` integer NOT NULL,
	`description_ar` text,
	`description_en` text,
	`qty_milli` integer DEFAULT 1000 NOT NULL,
	`unit_price_minor` integer NOT NULL,
	`line_total_minor` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "invoice_lines_position_pos" CHECK("invoice_lines"."position" >= 1),
	CONSTRAINT "invoice_lines_qty_pos" CHECK("invoice_lines"."qty_milli" > 0),
	CONSTRAINT "invoice_lines_money_nonneg" CHECK("invoice_lines"."unit_price_minor" >= 0 AND "invoice_lines"."line_total_minor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_lines_pos_uq` ON `invoice_lines` (`invoice_id`,`position`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text,
	`verification_code` text,
	`client_id` text NOT NULL,
	`project_id` text NOT NULL,
	`contract_id` text,
	`milestone_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`language_mode` text DEFAULT 'bilingual' NOT NULL,
	`currency` text NOT NULL,
	`issue_date` text,
	`due_date` text,
	`discount_type` text DEFAULT 'none' NOT NULL,
	`discount_value` integer DEFAULT 0 NOT NULL,
	`subtotal_minor` integer DEFAULT 0 NOT NULL,
	`discount_minor` integer DEFAULT 0 NOT NULL,
	`net_minor` integer DEFAULT 0 NOT NULL,
	`tax_rate_bp` integer DEFAULT 0 NOT NULL,
	`tax_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer DEFAULT 0 NOT NULL,
	`paid_minor` integer DEFAULT 0 NOT NULL,
	`notes_ar` text,
	`notes_en` text,
	`payment_instructions_ar` text,
	`payment_instructions_en` text,
	`seller_snapshot_json` text,
	`buyer_snapshot_json` text,
	`issued_at` integer,
	`paid_at` integer,
	`voided_at` integer,
	`void_reason` text,
	`last_reminder_at` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`milestone_id`) REFERENCES `payment_milestones`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "invoices_currency_len" CHECK(length("invoices"."currency") = 3),
	CONSTRAINT "invoices_money_nonneg" CHECK("invoices"."subtotal_minor" >= 0 AND "invoices"."discount_minor" >= 0 AND "invoices"."net_minor" >= 0 AND "invoices"."tax_minor" >= 0 AND "invoices"."total_minor" >= 0 AND "invoices"."paid_minor" >= 0),
	CONSTRAINT "invoices_tax_rate_range" CHECK("invoices"."tax_rate_bp" BETWEEN 0 AND 10000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_uq` ON `invoices` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_vcode_uq` ON `invoices` (`verification_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_milestone_active_uq` ON `invoices` (`milestone_id`) WHERE milestone_id IS NOT NULL AND status <> 'void';--> statement-breakpoint
CREATE INDEX `invoices_project_idx` ON `invoices` (`project_id`);--> statement-breakpoint
CREATE INDEX `invoices_client_idx` ON `invoices` (`client_id`);--> statement-breakpoint
CREATE INDEX `invoices_contract_idx` ON `invoices` (`contract_id`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `invoices_due_idx` ON `invoices` (`due_date`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`paid_on` text NOT NULL,
	`method` text DEFAULT 'bank_transfer' NOT NULL,
	`reference` text,
	`notes` text,
	`voided_at` integer,
	`void_reason` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "payments_amount_pos" CHECK("payments"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE INDEX `payments_invoice_idx` ON `payments` (`invoice_id`);