-- Add number column (nullable first for backfill)
ALTER TABLE "Notice" ADD COLUMN "number" INTEGER;

-- Backfill: assign 1, 2, 3, ... by createdAt order
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM "Notice"
)
UPDATE "Notice"
SET "number" = ordered.rn
FROM ordered
WHERE "Notice"."id" = ordered."id";

-- Enforce NOT NULL and UNIQUE
ALTER TABLE "Notice" ALTER COLUMN "number" SET NOT NULL;
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_number_key" UNIQUE ("number");
