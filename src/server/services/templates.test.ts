import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { templateClauses, templates } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import { getTemplate, listTemplates, seedSystemTemplates } from "./templates";

describe("seedSystemTemplates", () => {
  it("seeds all four system templates with their clauses", () => {
    const result = seedSystemTemplates();
    expect(result).toEqual({ inserted: 4, updated: 0, skipped: 0 });

    const { rows } = listTemplates();
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.isSystem).toBe(true);
      expect(row.clauseCount).toBeGreaterThan(0);
    }
  });

  it("is idempotent: seeding twice yields the same rows", () => {
    seedSystemTemplates();
    const first = db
      .select()
      .from(templates)
      .all()
      .map((row) => ({ id: row.id, key: row.key }))
      .sort((a, b) => (a.key ?? "").localeCompare(b.key ?? ""));
    const firstClauseCount = db.select().from(templateClauses).all().length;

    const second = seedSystemTemplates();
    expect(second).toEqual({ inserted: 0, updated: 4, skipped: 0 });

    const after = db
      .select()
      .from(templates)
      .all()
      .map((row) => ({ id: row.id, key: row.key }))
      .sort((a, b) => (a.key ?? "").localeCompare(b.key ?? ""));
    expect(after).toEqual(first);
    expect(db.select().from(templateClauses).all().length).toBe(
      firstClauseCount,
    );
  });

  it("returns clauses ordered by position", () => {
    seedSystemTemplates();
    const web = db
      .select()
      .from(templates)
      .where(eq(templates.key, "web-development"))
      .get();
    expect(web).toBeDefined();
    if (!web) return;
    const { template, clauses } = getTemplate(web.id);
    expect(template.key).toBe("web-development");
    expect(clauses.length).toBe(21);
    expect(clauses.map((c) => c.position)).toEqual(
      Array.from({ length: 21 }, (_, i) => i + 1),
    );
    expect(clauses[0].key).toBe("parties");
    expect(clauses[20].key).toBe("signatures");
  });

  it("throws NOT_FOUND for a missing template", () => {
    expect(() => getTemplate("missing")).toThrow(AppError);
  });

  // Keep last: mutates the shared template rows.
  it("never overwrites a non-system template with the same key", () => {
    db.delete(templates).run();
    const now = nowMs();
    db.insert(templates)
      .values({
        id: newId(),
        type: "contract",
        key: "web-development",
        nameAr: "مخصص",
        nameEn: "Custom",
        defaultLanguageMode: "bilingual",
        defaultsJson: "{}",
        isSystem: false,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const result = seedSystemTemplates();
    expect(result.skipped).toBe(1);
    expect(result.inserted).toBe(3);

    const kept = db
      .select()
      .from(templates)
      .where(eq(templates.key, "web-development"))
      .get();
    expect(kept?.isSystem).toBe(false);
    expect(kept?.nameEn).toBe("Custom");
  });
});
