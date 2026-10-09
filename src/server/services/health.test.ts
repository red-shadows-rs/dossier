import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { checkDatabase, getHealth } from "./health";

describe("checkDatabase", () => {
  it("returns true for the open app database", () => {
    expect(checkDatabase()).toBe(true);
    expect(getHealth()).toEqual({ ok: true });
  });

  it("returns false (not a throw) for a closed database", () => {
    const path = join(mkdtempSync(join(tmpdir(), "dossier-health-")), "x.sqlite");
    const handle = new Database(path);
    handle.close();

    expect(checkDatabase(handle)).toBe(false);
    expect(getHealth(handle)).toEqual({ ok: false });
  });
});
