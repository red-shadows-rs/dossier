CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text,
	`client_id` text NOT NULL,
	`project_id` text,
	`contract_id` text,
	`title_ar` text NOT NULL,
	`title_en` text,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`frequency` text DEFAULT 'monthly' NOT NULL,
	`interval_count` integer DEFAULT 1 NOT NULL,
	`start_date` text NOT NULL,
	`next_run_date` text NOT NULL,
	`end_date` text,
	`language_mode` text DEFAULT 'ar' NOT NULL,
	`currency` text DEFAULT 'SAR' NOT NULL,
	`tax_rate_bp` integer DEFAULT 0 NOT NULL,
	`discount_type` text DEFAULT 'none' NOT NULL,
	`discount_value` integer DEFAULT 0 NOT NULL,
	`subtotal_minor` integer DEFAULT 0 NOT NULL,
	`discount_minor` integer DEFAULT 0 NOT NULL,
	`net_minor` integer DEFAULT 0 NOT NULL,
	`tax_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer DEFAULT 0 NOT NULL,
	`payment_instructions_ar` text,
	`payment_instructions_en` text,
	`payment_terms_days` integer DEFAULT 14 NOT NULL,
	`auto_issue_invoice` integer DEFAULT 1 NOT NULL,
	`auto_send_email` integer DEFAULT 1 NOT NULL,
	`last_run_date` text,
	`last_invoice_id` text,
	`invoices_count` integer DEFAULT 0 NOT NULL,
	`notes_ar` text,
	`notes_en` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "subscriptions_currency_len" CHECK(length("subscriptions"."currency") = 3),
	CONSTRAINT "subscriptions_money_nonneg" CHECK("subscriptions"."subtotal_minor" >= 0 AND "subscriptions"."discount_minor" >= 0 AND "subscriptions"."net_minor" >= 0 AND "subscriptions"."tax_minor" >= 0 AND "subscriptions"."total_minor" >= 0),
	CONSTRAINT "subscriptions_tax_rate_range" CHECK("subscriptions"."tax_rate_bp" BETWEEN 0 AND 10000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_number_uq` ON `subscriptions` (`number`);
--> statement-breakpoint
CREATE INDEX `subscriptions_client_idx` ON `subscriptions` (`client_id`);
--> statement-breakpoint
CREATE INDEX `subscriptions_project_idx` ON `subscriptions` (`project_id`);
--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);
--> statement-breakpoint
CREATE INDEX `subscriptions_next_run_idx` ON `subscriptions` (`next_run_date`);
--> statement-breakpoint
CREATE TABLE `subscription_items` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`position` integer NOT NULL,
	`description_ar` text NOT NULL,
	`description_en` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price_minor` integer DEFAULT 0 NOT NULL,
	`tax_rate_bp` integer DEFAULT 0 NOT NULL,
	`subtotal_minor` integer DEFAULT 0 NOT NULL,
	`tax_minor` integer DEFAULT 0 NOT NULL,
	`total_minor` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sub_items_qty_positive" CHECK("subscription_items"."quantity" > 0),
	CONSTRAINT "sub_items_money_nonneg" CHECK("subscription_items"."unit_price_minor" >= 0 AND "subscription_items"."subtotal_minor" >= 0 AND "subscription_items"."tax_minor" >= 0 AND "subscription_items"."total_minor" >= 0),
	CONSTRAINT "sub_items_tax_rate_range" CHECK("subscription_items"."tax_rate_bp" BETWEEN 0 AND 10000)
);
--> statement-breakpoint
CREATE INDEX `sub_items_subscription_idx` ON `subscription_items` (`subscription_id`);
--> statement-breakpoint
ALTER TABLE `invoices` ADD COLUMN `subscription_id` text REFERENCES `subscriptions`(`id`) ON DELETE set null;
--> statement-breakpoint
CREATE INDEX `invoices_subscription_idx` ON `invoices` (`subscription_id`);
