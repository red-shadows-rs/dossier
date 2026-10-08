import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";

// 9.3: single-instance assumption (A-05) allows an in-memory limiter.
const WINDOW_MS = 15 * 60 * 1000;
const EMAIL_LIMIT = 5;
const IP_LIMIT = 30;

type Bucket = { count: number; resetAt: number };

const emailBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();

function sweep(now: number): void {
  for (const bucket of emailBuckets) {
    if (bucket[1].resetAt <= now) emailBuckets.delete(bucket[0]);
  }
  for (const bucket of ipBuckets) {
    if (bucket[1].resetAt <= now) ipBuckets.delete(bucket[0]);
  }
}

function bucketFor(map: Map<string, Bucket>, key: string, now: number): Bucket {
  const existing = map.get(key);
  if (existing && existing.resetAt > now) return existing;
  const fresh: Bucket = { count: 0, resetAt: now + WINDOW_MS };
  map.set(key, fresh);
  return fresh;
}

export function isRateLimited(email: string, ip: string): boolean {
  const now = nowMs();
  sweep(now);
  const emailBucket = emailBuckets.get(email);
  if (
    emailBucket &&
    emailBucket.resetAt > now &&
    emailBucket.count >= EMAIL_LIMIT
  ) {
    return true;
  }
  const ipBucket = ipBuckets.get(ip);
  if (ipBucket && ipBucket.resetAt > now && ipBucket.count >= IP_LIMIT) {
    return true;
  }
  return false;
}

export function assertNotRateLimited(email: string, ip: string): void {
  if (isRateLimited(email, ip)) {
    throw new AppError("RATE_LIMITED", "Too many attempts");
  }
}

export function recordFailure(email: string, ip: string): void {
  const now = nowMs();
  bucketFor(emailBuckets, email, now).count += 1;
  bucketFor(ipBuckets, ip, now).count += 1;
}

export function clearEmailFailures(email: string): void {
  emailBuckets.delete(email);
}

export function resetRateLimits(): void {
  emailBuckets.clear();
  ipBuckets.clear();
}
