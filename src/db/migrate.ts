import { db, runMigrations } from "@/db";
import { env } from "@/lib/env";

runMigrations(db, "drizzle");
console.log(`Database migrated: ${env.DATABASE_PATH}`);
