CREATE TABLE `contract_clauses` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`position` integer NOT NULL,
	`key` text,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`body_ar` text NOT NULL,
	`body_en` text NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "contract_clauses_position_pos" CHECK("contract_clauses"."position" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contract_clauses_pos_uq` ON `contract_clauses` (`contract_id`,`position`);--> statement-breakpoint
CREATE TABLE `contract_items` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`position` integer NOT NULL,
	`description_ar` text,
	`description_en` text,
	`qty_milli` integer DEFAULT 1000 NOT NULL,
	`unit_price_minor` integer NOT NULL,
	`line_total_minor` integer NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "contract_items_position_pos" CHECK("contract_items"."position" >= 1),
	CONSTRAINT "contract_items_qty_pos" CHECK("contract_items"."qty_milli" > 0),
	CONSTRAINT "contract_items_money_nonneg" CHECK("contract_items"."unit_price_minor" >= 0 AND "contract_items"."line_total_minor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contract_items_pos_uq` ON `contract_items` (`contract_id`,`position`);--> statement-breakpoint
CREATE TABLE `contract_signatories` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`version_id` text NOT NULL,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`title` text,
	`email` text,
	`signer_user_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`token_hash` text,
	`token_expires_at` integer,
	`otp_hash` text,
	`otp_expires_at` integer,
	`otp_attempts` integer DEFAULT 0 NOT NULL,
	`otp_verified_at` integer,
	`viewed_at` integer,
	`signed_at` integer,
	`signature_method` text,
	`signature_file_id` text,
	`typed_name` text,
	`consent_text_hash` text,
	`declined_at` integer,
	`decline_reason` text,
	`ip` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `contract_versions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`signer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`signature_file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `signatories_contract_idx` ON `contract_signatories` (`contract_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `signatories_token_uq` ON `contract_signatories` (`token_hash`);--> statement-breakpoint
CREATE TABLE `contract_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`version_no` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "contract_versions_version_pos" CHECK("contract_versions"."version_no" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contract_versions_uq` ON `contract_versions` (`contract_id`,`version_no`);--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text,
	`kind` text DEFAULT 'contract' NOT NULL,
	`parent_contract_id` text,
	`client_id` text NOT NULL,
	`project_id` text NOT NULL,
	`template_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`language_mode` text DEFAULT 'bilingual' NOT NULL,
	`has_fees` integer DEFAULT true NOT NULL,
	`title_ar` text,
	`title_en` text,
	`scope_ar` text,
	`scope_en` text,
	`currency` text NOT NULL,
	`discount_type` text DEFAULT 'none' NOT NULL,
	`discount_value` integer DEFAULT 0 NOT NULL,
	`subtotal_minor` integer DEFAULT 0 NOT NULL,
	`discount_minor` integer DEFAULT 0 NOT NULL,
	`net_minor` integer DEFAULT 0 NOT NULL,
	`tax_rate_bp` integer DEFAULT 0 NOT NULL,
	`tax_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer DEFAULT 0 NOT NULL,
	`milestone_mode` text DEFAULT 'percent' NOT NULL,
	`start_date` text,
	`end_date` text,
	`payment_terms_days` integer DEFAULT 14 NOT NULL,
	`governing_law_ar` text,
	`governing_law_en` text,
	`jurisdiction_ar` text,
	`jurisdiction_en` text,
	`signing_deadline` text,
	`internal_notes` text,
	`version_no` integer DEFAULT 1 NOT NULL,
	`current_version_id` text,
	`verification_code` text,
	`content_hash` text,
	`final_pdf_file_id` text,
	`pdf_sha256` text,
	`pdf_attempts` integer DEFAULT 0 NOT NULL,
	`sent_at` integer,
	`signed_at` integer,
	`completed_at` integer,
	`terminated_at` integer,
	`termination_reason` text,
	`cancelled_at` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`final_pdf_file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "contracts_currency_len" CHECK(length("contracts"."currency") = 3),
	CONSTRAINT "contracts_money_nonneg" CHECK("contracts"."subtotal_minor" >= 0 AND "contracts"."discount_minor" >= 0 AND "contracts"."net_minor" >= 0 AND "contracts"."tax_minor" >= 0 AND "contracts"."total_minor" >= 0),
	CONSTRAINT "contracts_tax_rate_range" CHECK("contracts"."tax_rate_bp" BETWEEN 0 AND 10000),
	CONSTRAINT "contracts_version_pos" CHECK("contracts"."version_no" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contracts_number_uq` ON `contracts` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `contracts_vcode_uq` ON `contracts` (`verification_code`);--> statement-breakpoint
CREATE INDEX `contracts_project_idx` ON `contracts` (`project_id`);--> statement-breakpoint
CREATE INDEX `contracts_client_idx` ON `contracts` (`client_id`);--> statement-breakpoint
CREATE INDEX `contracts_status_idx` ON `contracts` (`status`);--> statement-breakpoint
CREATE TABLE `email_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`to_email` text NOT NULL,
	`to_name` text,
	`locale` text DEFAULT 'en' NOT NULL,
	`template_key` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`scheduled_at` integer NOT NULL,
	`sent_at` integer,
	`entity_type` text,
	`entity_id` text,
	`created_at` integer NOT NULL,
	CONSTRAINT "email_outbox_attempts_nonneg" CHECK("email_outbox"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX `outbox_status_idx` ON `email_outbox` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE TABLE `payment_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`position` integer NOT NULL,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`percent_bp` integer,
	`amount_minor` integer NOT NULL,
	`tax_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer NOT NULL,
	`due_date` text,
	`trigger_note_ar` text,
	`trigger_note_en` text,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "milestones_position_pos" CHECK("payment_milestones"."position" >= 1),
	CONSTRAINT "milestones_money_nonneg" CHECK("payment_milestones"."amount_minor" >= 0 AND "payment_milestones"."tax_minor" >= 0 AND "payment_milestones"."total_minor" >= 0),
	CONSTRAINT "milestones_percent_range" CHECK("payment_milestones"."percent_bp" IS NULL OR "payment_milestones"."percent_bp" BETWEEN 0 AND 10000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `milestones_pos_uq` ON `payment_milestones` (`contract_id`,`position`);--> statement-breakpoint
CREATE TABLE `template_clauses` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`position` integer NOT NULL,
	`key` text,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`body_ar` text NOT NULL,
	`body_en` text NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "template_clauses_position_pos" CHECK("template_clauses"."position" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `template_clauses_pos_uq` ON `template_clauses` (`template_id`,`position`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'contract' NOT NULL,
	`key` text,
	`name_ar` text NOT NULL,
	`name_en` text NOT NULL,
	`description_ar` text,
	`description_en` text,
	`default_language_mode` text DEFAULT 'bilingual' NOT NULL,
	`defaults_json` text DEFAULT '{}' NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`archived_at` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `templates_key_uq` ON `templates` (`key`);