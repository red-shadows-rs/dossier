const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function resolveTaskboardUrl(
  reference: string | null | undefined,
  baseUrl?: string | null,
): string | null {
  const ref = reference?.trim();
  if (!ref) return null;

  if (/^https?:\/\//i.test(ref)) {
    try {
      const url = new URL(ref);
      return ALLOWED_PROTOCOLS.has(url.protocol) ? url.toString() : null;
    } catch {
      return null;
    }
  }

  const base = baseUrl?.trim();
  if (!base) return null;
  try {
    const url = new URL(
      ref.replace(/^\/+/, ""),
      base.endsWith("/") ? base : `${base}/`,
    );
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
