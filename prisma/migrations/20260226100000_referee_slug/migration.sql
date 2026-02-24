-- Add slug to Referee (URL-friendly, unique). Backfill with id so existing links keep working.
ALTER TABLE "Referee" ADD COLUMN "slug" TEXT;

UPDATE "Referee" SET "slug" = "id" WHERE "slug" IS NULL;

ALTER TABLE "Referee" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Referee_slug_key" ON "Referee"("slug");
