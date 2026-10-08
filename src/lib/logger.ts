export type LogFields = Record<string, unknown>;

type Level = "info" | "warn" | "error";

const SECRET_KEY_PATTERN =
  /token|secret|password|otp|signature|authorization|cookie/i;

function isPlainObject(value: unknown): value is LogFields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function redact(fields: LogFields): LogFields;
export function redact(value: unknown): unknown;
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }
  if (isPlainObject(value)) {
    const out: LogFields = {};
    for (const [key, val] of Object.entries(value)) {
      if (SECRET_KEY_PATTERN.test(key)) continue;
      out[key] = redact(val);
    }
    return out;
  }
  return value;
}

function write(level: Level, event: string, fields?: LogFields): void {
  const record: LogFields = {
    ts: Date.now(),
    level,
    event,
    ...redact(fields ?? {}),
  };
  process.stdout.write(`${JSON.stringify(record)}\n`);
}

export const logger = {
  info: (event: string, fields?: LogFields): void =>
    write("info", event, fields),
  warn: (event: string, fields?: LogFields): void =>
    write("warn", event, fields),
  error: (event: string, fields?: LogFields): void =>
    write("error", event, fields),
};
