-- Backfill required columns so Prisma can add NOT NULL / FK without failing on existing rows.
-- 1) Season: add year (existing 1 row)
ALTER TABLE "Season" ADD COLUMN "year" INTEGER;
UPDATE "Season" SET "year" = 2024 WHERE "year" IS NULL;
ALTER TABLE "Season" ALTER COLUMN "year" SET NOT NULL;
CREATE UNIQUE INDEX "Season_year_key" ON "Season"("year");

-- 2) League: add seasonId and link to existing Season (existing 3 rows)
ALTER TABLE "League" ADD COLUMN "seasonId" TEXT;
UPDATE "League" SET "seasonId" = (SELECT "id" FROM "Season" LIMIT 1) WHERE "seasonId" IS NULL;
ALTER TABLE "League" ALTER COLUMN "seasonId" SET NOT NULL;
ALTER TABLE "League" ADD CONSTRAINT "League_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
