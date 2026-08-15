-- drizzle-rollback

DROP INDEX IF EXISTS "account_userId_idx";
--> statement-breakpoint

DROP INDEX IF EXISTS "session_userId_idx";
--> statement-breakpoint

DROP INDEX IF EXISTS "verification_identifier_idx";
--> statement-breakpoint

ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_user_id_user_id_fk";
--> statement-breakpoint

ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_user_id_user_id_fk";
--> statement-breakpoint

DROP TABLE IF EXISTS "account";
--> statement-breakpoint

DROP TABLE IF EXISTS "session";
--> statement-breakpoint

DROP TABLE IF EXISTS "verification";
--> statement-breakpoint

DROP TABLE IF EXISTS "user";
--> statement-breakpoint
