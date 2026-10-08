import { AppError } from "@/lib/errors";

function stringifyValue(value: unknown): string {
  if (value === null) return "null";

  const type = typeof value;
  if (type === "boolean") return value ? "true" : "false";
  if (type === "string")
    return JSON.stringify((value as string).normalize("NFC"));
  if (type === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new AppError(
        "INTERNAL",
        "canonicalize: numbers must be finite safe integers",
      );
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) =>
      item === undefined ? "null" : stringifyValue(item),
    );
    return `[${items.join(",")}]`;
  }
  if (type === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const body = keys
      .map(
        (key) =>
          `${JSON.stringify(key.normalize("NFC"))}:${stringifyValue(record[key])}`,
      )
      .join(",");
    return `{${body}}`;
  }
  throw new AppError(
    "INTERNAL",
    `canonicalize: unsupported value of type ${type}`,
  );
}

export function canonicalize(value: unknown): string {
  return stringifyValue(value);
}
