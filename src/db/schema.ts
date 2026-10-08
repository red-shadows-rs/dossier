import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import * as C from "@/lib/constants";

const pk = () => text("id").primaryKey();
const createdAt = () => integer("created_at").notNull();
const updatedAt = () => integer("updated_at").notNull();
const bool = (name: string) =>
  integer(name, { mode: "boolean" }).notNull().default(false);

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

export const schema = {
  users,
  sessions,
  settings,
  files,
  auditLog,
  numberSequences,
};
