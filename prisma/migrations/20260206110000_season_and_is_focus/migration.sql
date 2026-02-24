-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- AlterTable Round: add seasonId, rename isCurrent -> isFocus
ALTER TABLE "Round" ADD COLUMN "seasonId" TEXT;
ALTER TABLE "Round" RENAME COLUMN "isCurrent" TO "isFocus";

-- DropIndex (old index on isCurrent)
DROP INDEX IF EXISTS "Round_leagueId_isCurrent_idx";

-- CreateIndex
CREATE INDEX "Round_leagueId_isFocus_idx" ON "Round"("leagueId", "isFocus");

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
