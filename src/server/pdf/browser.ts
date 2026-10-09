import { chromium, type Browser } from "playwright";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

let browserPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const browser = await browserPromise;
    browser.on("disconnected", () => {
      browserPromise = null;
    });
    return browser;
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const pending = browserPromise;
  browserPromise = null;
  try {
    const browser = await pending;
    await browser.close();
  } catch {
    // already gone
  }
}

let shuttingDown = false;
function shutdown(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  void closeBrowser();
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

// 12.2 — tiny semaphore, capacity PDF_CONCURRENCY.
class Semaphore {
  private available: number;
  private readonly queue: Array<() => void> = [];

  constructor(capacity: number) {
    this.available = Math.max(1, capacity);
  }

  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available -= 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
      return;
    }
    this.available += 1;
  }
}

export const renderSemaphore = new Semaphore(env.PDF_CONCURRENCY);

export function logPdfError(message: string, error: unknown): void {
  logger.error(message, {
    err: error instanceof Error ? error.message : String(error),
  });
}
