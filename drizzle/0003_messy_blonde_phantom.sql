CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`client_id` text NOT NULL,
	`name_ar` text,
	`name_en` text,
	`description` text,
	`status` text DEFAULT 'lead' NOT NULL,
	`start_date` text,
	`end_date` text,
	`budget_minor` integer,
	`currency` text NOT NULL,
	`taskboard_ref` text,
	`notes` text,
	`archived_at` integer,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "projects_name_required" CHECK("projects"."name_ar" IS NOT NULL OR "projects"."name_en" IS NOT NULL),
	CONSTRAINT "projects_currency_len" CHECK(length("projects"."currency") = 3),
	CONSTRAINT "projects_budget_nonneg" CHECK("projects"."budget_minor" IS NULL OR "projects"."budget_minor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_code_uq` ON `projects` (`code`);--> statement-breakpoint
CREATE INDEX `projects_client_idx` ON `projects` (`client_id`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);