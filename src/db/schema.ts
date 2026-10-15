import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import * as C from "@/lib/constants";

const pk = () => text("id").primaryKey();
const createdAt = () => integer("created_at").notNull();
const updatedAt = () => integer("updated_at").notNull();
const bool = (name: string) =>
  integer(name, { mode: "boolean" }).notNull().default(false);
const money = (name: string) => integer(name).notNull().default(0);

// ───────── identity ─────────
export const users = sqliteTable(
  "users",
  {
    id: pk(),
    email: text("email").notNull(), // stored lowercase, trimmed
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: C.ROLES }).notNull().default("member"),
    status: text("status", { enum: ["active", "disabled"] })
      .notNull()
      .default("active"),
    locale: text("locale", { enum: C.LOCALES }).notNull().default("ar"),
    canSignForCompany: bool("can_sign_for_company"), // may sign as provider
    signerTitleAr: text("signer_title_ar"),
    signerTitleEn: text("signer_title_en"),
    lastLoginAt: integer("last_login_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // = hmacToken(rawToken)
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: integer("expires_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_exp_idx").on(t.expiresAt),
  ],
);

// key/value JSON settings, validated by Zod schemas in src/lib/validation/settings.ts (21.1)
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(), // 'company' | 'defaults' | 'numbering' | 'signing' | 'email'
  valueJson: text("value_json").notNull(),
  updatedAt: updatedAt(),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
});

export const files = sqliteTable(
  "files",
  {
    id: pk(),
    kind: text("kind", { enum: C.FILE_KINDS }).notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    storagePath: text("storage_path").notNull(), // relative to DATA_DIR/files, e.g. '2026/10/<id>'
    originalName: text("original_name"), // display only, sanitized, never used as a path
    ownerType: text("owner_type"), // 'project' | 'contract' | 'setting' | ...
    ownerId: text("owner_id"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [index("files_owner_idx").on(t.ownerType, t.ownerId)],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ts: integer("ts").notNull(),
    actorType: text("actor_type", {
      enum: ["user", "signer", "system"],
    }).notNull(),
    actorId: text("actor_id"),
    action: text("action").notNull(), // see 21.5
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    metaJson: text("meta_json"), // small JSON, NO secrets
  },
  (t) => [
    index("audit_entity_idx").on(t.entityType, t.entityId),
    index("audit_ts_idx").on(t.ts),
  ],
);

export const numberSequences = sqliteTable(
  "number_sequences",
  {
    seqKey: text("seq_key", { enum: C.SEQ_KEYS }).notNull(),
    year: integer("year").notNull(), // 0 for non-yearly sequences (project)
    lastValue: integer("last_value").notNull().default(0),
  },
  (t) => [uniqueIndex("number_sequences_uq").on(t.seqKey, t.year)],
);

// ───────── parties & projects ─────────
export const clients = sqliteTable(
  "clients",
  {
    id: pk(),
    type: text("type", { enum: C.CLIENT_TYPES }).notNull().default("company"),
    nameAr: text("name_ar"), // at least one required (service + CHECK)
    nameEn: text("name_en"),
    legalNameAr: text("legal_name_ar"),
    legalNameEn: text("legal_name_en"),
    email: text("email"),
    phone: text("phone"),
    country: text("country"), // ISO 3166-1 alpha-2
    city: text("city"),
    addressAr: text("address_ar"),
    addressEn: text("address_en"),
    taxNumber: text("tax_number"), // VAT no.
    crNumber: text("cr_number"), // commercial registration
    repNameAr: text("rep_name_ar"), // legal representative
    repNameEn: text("rep_name_en"),
    repTitleAr: text("rep_title_ar"),
    repTitleEn: text("rep_title_en"),
    preferredLanguage: text("preferred_language", { enum: C.LOCALES })
      .notNull()
      .default("ar"),
    notes: text("notes"),
    archivedAt: integer("archived_at"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("clients_archived_idx").on(t.archivedAt),
    check(
      "clients_name_required",
      sql`${t.nameAr} IS NOT NULL OR ${t.nameEn} IS NOT NULL`,
    ),
  ],
);

export const projects = sqliteTable(
  "projects",
  {
    id: pk(),
    code: text("code").notNull(), // 'P-0001', from sequence 'project'
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    nameAr: text("name_ar"), // at least one required (service + CHECK)
    nameEn: text("name_en"),
    description: text("description"),
    status: text("status", { enum: C.PROJECT_STATUSES })
      .notNull()
      .default("lead"),
    startDate: text("start_date"), // 'YYYY-MM-DD'
    endDate: text("end_date"),
    budgetMinor: integer("budget_minor"), // optional
    currency: text("currency").notNull(),
    taskboardRef: text("taskboard_ref"), // Phase 4 optional link to task-board
    notes: text("notes"),
    archivedAt: integer("archived_at"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("projects_code_uq").on(t.code),
    index("projects_client_idx").on(t.clientId),
    index("projects_status_idx").on(t.status),
    check(
      "projects_name_required",
      sql`${t.nameAr} IS NOT NULL OR ${t.nameEn} IS NOT NULL`,
    ),
    check("projects_currency_len", sql`length(${t.currency}) = 3`),
    check(
      "projects_budget_nonneg",
      sql`${t.budgetMinor} IS NULL OR ${t.budgetMinor} >= 0`,
    ),
  ],
);

// ───────── templates ─────────
export const templates = sqliteTable(
  "templates",
  {
    id: pk(),
    type: text("type", { enum: C.TEMPLATE_TYPES })
      .notNull()
      .default("contract"),
    key: text("key"), // stable key for system templates, e.g. 'web-development'
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    defaultLanguageMode: text("default_language_mode", { enum: C.LANG_MODES })
      .notNull()
      .default("bilingual"),
    defaultsJson: text("defaults_json").notNull().default("{}"), // templateDefaultsSchema (11.6)
    isSystem: bool("is_system"),
    archivedAt: integer("archived_at"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("templates_key_uq").on(t.key)],
);

export const templateClauses = sqliteTable(
  "template_clauses",
  {
    id: pk(),
    templateId: text("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    position: integer("position").notNull(), // 1-based, contiguous
    key: text("key"), // e.g. 'scope', 'confidentiality'
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en").notNull(),
    bodyAr: text("body_ar").notNull(),
    bodyEn: text("body_en").notNull(),
  },
  (t) => [
    uniqueIndex("template_clauses_pos_uq").on(t.templateId, t.position),
    check("template_clauses_position_pos", sql`${t.position} >= 1`),
  ],
);

// ───────── contracts ─────────
export const contracts = sqliteTable(
  "contracts",
  {
    id: pk(),
    number: text("number"), // assigned at first send; NULL while never sent
    kind: text("kind", { enum: ["contract", "amendment"] })
      .notNull()
      .default("contract"), // only 'contract' used now
    parentContractId: text("parent_contract_id"), // reserved for amendments (Phase 5)
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    templateId: text("template_id").references(() => templates.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: C.CONTRACT_STATUSES })
      .notNull()
      .default("draft"),
    languageMode: text("language_mode", { enum: C.LANG_MODES })
      .notNull()
      .default("bilingual"),
    hasFees: integer("has_fees", { mode: "boolean" }).notNull().default(true), // false for NDAs
    titleAr: text("title_ar"),
    titleEn: text("title_en"),
    scopeAr: text("scope_ar"),
    scopeEn: text("scope_en"),
    currency: text("currency").notNull(),
    discountType: text("discount_type", { enum: C.DISCOUNT_TYPES })
      .notNull()
      .default("none"),
    discountValue: integer("discount_value").notNull().default(0), // bp if percent, minor if fixed
    subtotalMinor: money("subtotal_minor"),
    discountMinor: money("discount_minor"),
    netMinor: money("net_minor"),
    taxRateBp: integer("tax_rate_bp").notNull().default(0),
    taxMinor: money("tax_minor"),
    totalMinor: money("total_minor"),
    milestoneMode: text("milestone_mode", { enum: C.MILESTONE_MODES })
      .notNull()
      .default("percent"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    paymentTermsDays: integer("payment_terms_days").notNull().default(14),
    governingLawAr: text("governing_law_ar"),
    governingLawEn: text("governing_law_en"),
    jurisdictionAr: text("jurisdiction_ar"),
    jurisdictionEn: text("jurisdiction_en"),
    signingDeadline: text("signing_deadline"), // 'YYYY-MM-DD' or NULL
    internalNotes: text("internal_notes"),
    versionNo: integer("version_no").notNull().default(1),
    currentVersionId: text("current_version_id"), // no FK (avoids circular FK)
    verificationCode: text("verification_code"),
    contentHash: text("content_hash"), // sha256 of canonical snapshot (7.6)
    finalPdfFileId: text("final_pdf_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    pdfSha256: text("pdf_sha256"),
    pdfAttempts: integer("pdf_attempts").notNull().default(0),
    sentAt: integer("sent_at"),
    signedAt: integer("signed_at"),
    completedAt: integer("completed_at"),
    terminatedAt: integer("terminated_at"),
    terminationReason: text("termination_reason"),
    cancelledAt: integer("cancelled_at"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("contracts_number_uq").on(t.number),
    uniqueIndex("contracts_vcode_uq").on(t.verificationCode),
    index("contracts_project_idx").on(t.projectId),
    index("contracts_client_idx").on(t.clientId),
    index("contracts_status_idx").on(t.status),
    check("contracts_currency_len", sql`length(${t.currency}) = 3`),
    check(
      "contracts_money_nonneg",
      sql`${t.subtotalMinor} >= 0 AND ${t.discountMinor} >= 0 AND ${t.netMinor} >= 0 AND ${t.taxMinor} >= 0 AND ${t.totalMinor} >= 0`,
    ),
    check("contracts_tax_rate_range", sql`${t.taxRateBp} BETWEEN 0 AND 10000`),
    check("contracts_version_pos", sql`${t.versionNo} >= 1`),
  ],
);

export const contractItems = sqliteTable(
  "contract_items",
  {
    id: pk(),
    contractId: text("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    qtyMilli: integer("qty_milli").notNull().default(1000), // quantity ×1000
    unitPriceMinor: integer("unit_price_minor").notNull(),
    lineTotalMinor: integer("line_total_minor").notNull(), // mulDivRound(unit, qtyMilli, 1000)
  },
  (t) => [
    uniqueIndex("contract_items_pos_uq").on(t.contractId, t.position),
    check("contract_items_position_pos", sql`${t.position} >= 1`),
    check("contract_items_qty_pos", sql`${t.qtyMilli} > 0`),
    check(
      "contract_items_money_nonneg",
      sql`${t.unitPriceMinor} >= 0 AND ${t.lineTotalMinor} >= 0`,
    ),
  ],
);

export const contractClauses = sqliteTable(
  "contract_clauses",
  {
    id: pk(),
    contractId: text("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    key: text("key"),
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en").notNull(),
    bodyAr: text("body_ar").notNull(),
    bodyEn: text("body_en").notNull(),
  },
  (t) => [
    uniqueIndex("contract_clauses_pos_uq").on(t.contractId, t.position),
    check("contract_clauses_position_pos", sql`${t.position} >= 1`),
  ],
);

export const paymentMilestones = sqliteTable(
  "payment_milestones",
  {
    id: pk(),
    contractId: text("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en").notNull(),
    percentBp: integer("percent_bp"), // set when milestoneMode = 'percent'
    amountMinor: integer("amount_minor").notNull(), // net (pre-tax) amount
    taxMinor: integer("tax_minor").notNull().default(0),
    totalMinor: integer("total_minor").notNull(), // amount + tax
    dueDate: text("due_date"), // optional fixed date
    triggerNoteAr: text("trigger_note_ar"),
    triggerNoteEn: text("trigger_note_en"),
  },
  (t) => [
    uniqueIndex("milestones_pos_uq").on(t.contractId, t.position),
    check("milestones_position_pos", sql`${t.position} >= 1`),
    check(
      "milestones_money_nonneg",
      sql`${t.amountMinor} >= 0 AND ${t.taxMinor} >= 0 AND ${t.totalMinor} >= 0`,
    ),
    check(
      "milestones_percent_range",
      sql`${t.percentBp} IS NULL OR ${t.percentBp} BETWEEN 0 AND 10000`,
    ),
  ],
);

export const contractVersions = sqliteTable(
  "contract_versions",
  {
    id: pk(),
    contractId: text("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    snapshotJson: text("snapshot_json").notNull(), // canonical JSON (7.6)
    contentHash: text("content_hash").notNull(),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("contract_versions_uq").on(t.contractId, t.versionNo),
    check("contract_versions_version_pos", sql`${t.versionNo} >= 1`),
  ],
);

export const contractSignatories = sqliteTable(
  "contract_signatories",
  {
    id: pk(),
    contractId: text("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    versionId: text("version_id")
      .notNull()
      .references(() => contractVersions.id, { onDelete: "restrict" }),
    role: text("role", { enum: C.SIGNATORY_ROLES }).notNull(),
    name: text("name").notNull(),
    title: text("title"),
    email: text("email"),
    signerUserId: text("signer_user_id").references(() => users.id, {
      onDelete: "set null",
    }), // provider side
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: C.SIGNATORY_STATUSES })
      .notNull()
      .default("pending"),
    tokenHash: text("token_hash"), // client link
    tokenExpiresAt: integer("token_expires_at"),
    otpHash: text("otp_hash"),
    otpExpiresAt: integer("otp_expires_at"),
    otpAttempts: integer("otp_attempts").notNull().default(0),
    otpVerifiedAt: integer("otp_verified_at"),
    viewedAt: integer("viewed_at"),
    signedAt: integer("signed_at"),
    signatureMethod: text("signature_method", { enum: C.SIGNATURE_METHODS }),
    signatureFileId: text("signature_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    typedName: text("typed_name"),
    consentTextHash: text("consent_text_hash"),
    declinedAt: integer("declined_at"),
    declineReason: text("decline_reason"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [
    index("signatories_contract_idx").on(t.contractId),
    uniqueIndex("signatories_token_uq").on(t.tokenHash),
  ],
);
// ───────── invoices & payments ─────────
export const invoices = sqliteTable(
  "invoices",
  {
    id: pk(),
    number: text("number"), // assigned at ISSUE; NULL for drafts
    verificationCode: text("verification_code"), // assigned at ISSUE
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    contractId: text("contract_id").references(() => contracts.id, {
      onDelete: "restrict",
    }), // optional
    milestoneId: text("milestone_id").references(() => paymentMilestones.id, {
      onDelete: "restrict",
    }),
    status: text("status", { enum: C.INVOICE_STATUSES })
      .notNull()
      .default("draft"),
    languageMode: text("language_mode", { enum: C.INVOICE_LANG_MODES })
      .notNull()
      .default("ar"),
    currency: text("currency").notNull(),
    issueDate: text("issue_date"),
    dueDate: text("due_date"),
    discountType: text("discount_type", { enum: C.DISCOUNT_TYPES })
      .notNull()
      .default("none"),
    discountValue: integer("discount_value").notNull().default(0),
    subtotalMinor: money("subtotal_minor"),
    discountMinor: money("discount_minor"),
    netMinor: money("net_minor"),
    taxRateBp: integer("tax_rate_bp").notNull().default(0),
    taxMinor: money("tax_minor"),
    totalMinor: money("total_minor"),
    paidMinor: money("paid_minor"), // cached sum of non-voided payments
    notesAr: text("notes_ar"),
    notesEn: text("notes_en"),
    paymentInstructionsAr: text("payment_instructions_ar"),
    paymentInstructionsEn: text("payment_instructions_en"),
    sellerSnapshotJson: text("seller_snapshot_json"), // frozen at issue
    buyerSnapshotJson: text("buyer_snapshot_json"), // frozen at issue
    issuedAt: integer("issued_at"),
    paidAt: integer("paid_at"),
    voidedAt: integer("voided_at"),
    voidReason: text("void_reason"),
    lastReminderAt: integer("last_reminder_at"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("invoices_number_uq").on(t.number),
    uniqueIndex("invoices_vcode_uq").on(t.verificationCode),
    // one ACTIVE invoice per milestone (voiding frees the milestone):
    uniqueIndex("invoices_milestone_active_uq")
      .on(t.milestoneId)
      .where(sql`milestone_id IS NOT NULL AND status <> 'void'`),
    index("invoices_project_idx").on(t.projectId),
    index("invoices_client_idx").on(t.clientId),
    index("invoices_contract_idx").on(t.contractId),
    index("invoices_status_idx").on(t.status),
    index("invoices_due_idx").on(t.dueDate),
    check("invoices_currency_len", sql`length(${t.currency}) = 3`),
    check(
      "invoices_money_nonneg",
      sql`${t.subtotalMinor} >= 0 AND ${t.discountMinor} >= 0 AND ${t.netMinor} >= 0 AND ${t.taxMinor} >= 0 AND ${t.totalMinor} >= 0 AND ${t.paidMinor} >= 0`,
    ),
    check("invoices_tax_rate_range", sql`${t.taxRateBp} BETWEEN 0 AND 10000`),
  ],
);

export const invoiceLines = sqliteTable(
  "invoice_lines",
  {
    id: pk(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    qtyMilli: integer("qty_milli").notNull().default(1000),
    unitPriceMinor: integer("unit_price_minor").notNull(),
    lineTotalMinor: integer("line_total_minor").notNull(),
  },
  (t) => [
    uniqueIndex("invoice_lines_pos_uq").on(t.invoiceId, t.position),
    check("invoice_lines_position_pos", sql`${t.position} >= 1`),
    check("invoice_lines_qty_pos", sql`${t.qtyMilli} > 0`),
    check(
      "invoice_lines_money_nonneg",
      sql`${t.unitPriceMinor} >= 0 AND ${t.lineTotalMinor} >= 0`,
    ),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: pk(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    amountMinor: integer("amount_minor").notNull(), // > 0
    paidOn: text("paid_on").notNull(), // 'YYYY-MM-DD'
    method: text("method", { enum: C.PAYMENT_METHODS })
      .notNull()
      .default("bank_transfer"),
    reference: text("reference"),
    notes: text("notes"),
    voidedAt: integer("voided_at"),
    voidReason: text("void_reason"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    index("payments_invoice_idx").on(t.invoiceId),
    check("payments_amount_pos", sql`${t.amountMinor} > 0`),
  ],
);

// ───────── outbound email queue ─────────
export const emailOutbox = sqliteTable(
  "email_outbox",
  {
    id: pk(),
    toEmail: text("to_email").notNull(),
    toName: text("to_name"),
    locale: text("locale", { enum: C.LOCALES }).notNull().default("en"),
    templateKey: text("template_key").notNull(),
    payloadJson: text("payload_json").notNull(), // variables + attachment file ids; NO raw tokens
    status: text("status", { enum: C.EMAIL_STATUSES })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    scheduledAt: integer("scheduled_at").notNull(),
    sentAt: integer("sent_at"),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("outbox_status_idx").on(t.status, t.scheduledAt),
    check("email_outbox_attempts_nonneg", sql`${t.attempts} >= 0`),
  ],
);

export const schema = {
  users,
  sessions,
  settings,
  files,
  auditLog,
  numberSequences,
  clients,
  projects,
  templates,
  templateClauses,
  contracts,
  contractItems,
  contractClauses,
  paymentMilestones,
  contractVersions,
  contractSignatories,
  invoices,
  invoiceLines,
  payments,
  emailOutbox,
};
