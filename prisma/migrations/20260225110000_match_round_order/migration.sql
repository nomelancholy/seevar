-- Add roundOrder to Match (라운드 내 경기 순서, URL용)
ALTER TABLE "Match" ADD COLUMN "roundOrder" INTEGER;

-- Backfill: per round, order by playedAt then id, assign 1-based order
UPDATE "Match" m
SET "roundOrder" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "roundId" ORDER BY "playedAt" ASC NULLS LAST, id) AS rn
  FROM "Match"
) sub
WHERE m.id = sub.id;

-- Set any remaining nulls (no playedAt) to 1 so we can set NOT NULL
UPDATE "Match" SET "roundOrder" = 1 WHERE "roundOrder" IS NULL;

ALTER TABLE "Match" ALTER COLUMN "roundOrder" SET NOT NULL;

CREATE UNIQUE INDEX "Match_roundId_roundOrder_key" ON "Match"("roundId", "roundOrder");
