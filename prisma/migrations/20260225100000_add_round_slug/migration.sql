-- Add slug to Round for readable URLs (e.g. round-1, round-5)
ALTER TABLE "Round" ADD COLUMN "slug" TEXT;

-- Backfill: slug = 'round-' || number
UPDATE "Round" SET "slug" = 'round-' || "number";

-- Not null and unique(leagueId, slug)
ALTER TABLE "Round" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Round_leagueId_slug_key" ON "Round"("leagueId", "slug");
