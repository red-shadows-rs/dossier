// Dossier - Messages
// https://github.com/red-shadows-rs/dossier

import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import { ERROR_CODES } from "@/lib/errors";
import { CONTRACT_ISSUE_CODES } from "@/server/services/contracts-validate";

type Messages = Record<string, unknown>;

function flatten(node: Messages, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out.set(path, value);
    } else if (value !== null && typeof value === "object") {
      for (const [nestedKey, nestedValue] of flatten(value as Messages, path)) {
        out.set(nestedKey, nestedValue);
      }
    }
  }
  return out;
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)[^}]*\}/g)].map((match) => match[1]).sort();
}

const enKeys = flatten(en as Messages);
const arKeys = flatten(ar as Messages);

describe("messages", () => {
  it("has identical flattened key sets", () => {
    const enSorted = [...enKeys.keys()].sort();
    const arSorted = [...arKeys.keys()].sort();
    expect(arSorted).toEqual(enSorted);
  });

  it("has no empty or whitespace-only values", () => {
    for (const [key, value] of enKeys) {
      expect(value.trim(), `en.${key}`).not.toBe("");
    }
    for (const [key, value] of arKeys) {
      expect(value.trim(), `ar.${key}`).not.toBe("");
    }
  });

  it("uses identical placeholders per key", () => {
    for (const [key, value] of enKeys) {
      const other = arKeys.get(key);
      expect(other, `missing ar.${key}`).toBeDefined();
      expect(placeholders(other ?? ""), `ar.${key}`).toEqual(
        placeholders(value),
      );
    }
  });

  it("defines an errors key for every ErrorCode", () => {
    for (const code of ERROR_CODES) {
      expect(enKeys.has(`errors.${code}`), `en.errors.${code}`).toBe(true);
      expect(arKeys.has(`errors.${code}`), `ar.errors.${code}`).toBe(true);
    }
  });

  it("defines a message for every contract issue code", () => {
    for (const code of CONTRACT_ISSUE_CODES) {
      expect(enKeys.has(`contracts.issue.${code}`), `en ${code}`).toBe(true);
      expect(arKeys.has(`contracts.issue.${code}`), `ar ${code}`).toBe(true);
    }
  });
});
