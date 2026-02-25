-- AlterTable
ALTER TABLE "Moment" ADD COLUMN IF NOT EXISTS "duration" INTEGER NOT NULL DEFAULT 0;

-- Backfill: duration = endMinute - startMinute where both are set
UPDATE "Moment"
SET "duration" = COALESCE("endMinute", 0) - COALESCE("startMinute", 0)
WHERE "startMinute" IS NOT NULL AND "endMinute" IS NOT NULL;

-- Clamp backfilled duration to 0 where it was negative (data inconsistency)
UPDATE "Moment" SET "duration" = 0 WHERE "duration" < 0;
