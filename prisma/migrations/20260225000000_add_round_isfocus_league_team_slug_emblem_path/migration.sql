-- League: add slug (required), backfill then unique per season
ALTER TABLE "League" ADD COLUMN "slug" TEXT;
UPDATE "League" SET "slug" = CASE
  WHEN "name" = 'K League 1' THEN 'kleague1'
  WHEN "name" = 'K League 2' THEN 'kleague2'
  WHEN "name" = 'K League Super Cup' THEN 'supercup'
  ELSE 'league-' || "id"
END;
ALTER TABLE "League" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "League_seasonId_slug_key" ON "League"("seasonId", "slug");

-- Round: add isFocus, add unique(leagueId, number)
ALTER TABLE "Round" ADD COLUMN "isFocus" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "Round_leagueId_number_key" ON "Round"("leagueId", "number");

-- Team: add slug (nullable), rename emblem -> emblemPath (keep data)
ALTER TABLE "Team" ADD COLUMN "slug" TEXT;
ALTER TABLE "Team" RENAME COLUMN "emblem" TO "emblemPath";
