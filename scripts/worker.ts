import { sqlite } from "@/db";
import { nowMs } from "@/lib/dates";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  createTransport,
  processOutbox,
  type MailSender,
} from "@/server/services/email-worker";
import { retryPendingFinalizations } from "@/server/services/contract-finalize";
import { expireContracts } from "@/server/services/contracts-lifecycle";
import { runDailyJobs } from "@/server/services/daily-jobs";
import { setInternalSetting } from "@/server/services/settings";

const OUTBOX_INTERVAL_MS = 5_000;
const FINALIZE_INTERVAL_MS = 5 * 60 * 1000;
const EXPIRE_INTERVAL_MS = 60 * 60 * 1000;
const DAILY_INTERVAL_MS = 15 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 60_000;

let stopping = false;
let inFlight: Promise<void> = Promise.resolve();

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writeHeartbeat(): void {
  const ts = nowMs();
  setInternalSetting("worker_heartbeat", { ts });
  logger.info("worker_heartbeat", { ts });
}

function safeHeartbeat(): void {
  try {
    writeHeartbeat();
  } catch (error) {
    logger.error("worker_job_failed", {
      job: "heartbeat",
      message: errorMessage(error),
    });
  }
}

async function runOutboxJob(sender: MailSender | null): Promise<void> {
  try {
    await processOutbox(sender);
  } catch (error) {
    logger.error("worker_job_failed", {
      job: "processOutbox",
      message: errorMessage(error),
    });
  }
}

async function runFinalizeJob(): Promise<void> {
  try {
    await retryPendingFinalizations();
  } catch (error) {
    logger.error("worker_job_failed", {
      job: "retryPendingFinalizations",
      message: errorMessage(error),
    });
  }
}

function runExpireJob(): void {
  try {
    expireContracts();
  } catch (error) {
    logger.error("worker_job_failed", {
      job: "expireContracts",
      message: errorMessage(error),
    });
  }
}

function runDailyJob(): void {
  try {
    runDailyJobs();
  } catch (error) {
    logger.error("worker_job_failed", {
      job: "runDailyJobs",
      message: errorMessage(error),
    });
  }
}

function start(sender: MailSender | null): void {
  logger.info("worker_started", { nodeEnv: env.NODE_ENV });

  safeHeartbeat();

  const scheduleOutbox = (): void => {
    inFlight = inFlight.then(async () => {
      if (stopping) return;
      await runOutboxJob(sender);
    });
  };

  const scheduleFinalize = (): void => {
    inFlight = inFlight.then(async () => {
      if (stopping) return;
      await runFinalizeJob();
    });
  };

  const expireTimer = setInterval(() => {
    if (stopping) return;
    runExpireJob();
  }, EXPIRE_INTERVAL_MS);

  const outboxTimer = setInterval(scheduleOutbox, OUTBOX_INTERVAL_MS);
  const finalizeTimer = setInterval(scheduleFinalize, FINALIZE_INTERVAL_MS);
  const dailyTimer = setInterval(() => {
    if (stopping) return;
    runDailyJob();
  }, DAILY_INTERVAL_MS);
  const heartbeatTimer = setInterval(() => {
    if (stopping) return;
    safeHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);

  scheduleOutbox();
  scheduleFinalize();
  runExpireJob();
  runDailyJob();

  const shutdown = (signal: string): void => {
    if (stopping) return;
    stopping = true;
    logger.info("worker_stopping", { signal });
    clearInterval(outboxTimer);
    clearInterval(finalizeTimer);
    clearInterval(expireTimer);
    clearInterval(dailyTimer);
    clearInterval(heartbeatTimer);
    inFlight
      .catch(() => undefined)
      .finally(() => {
        try {
          sqlite.close();
        } catch (error) {
          logger.error("worker_close_failed", { message: errorMessage(error) });
        }
        process.exit(0);
      });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

function main(): void {
  const sender = createTransport();
  if (env.NODE_ENV === "production" && sender === null) {
    throw new Error("SMTP configuration is required in production (worker)");
  }
  start(sender);
}

try {
  main();
} catch (error) {
  logger.error("worker_start_failed", { message: errorMessage(error) });
  process.exit(1);
}
