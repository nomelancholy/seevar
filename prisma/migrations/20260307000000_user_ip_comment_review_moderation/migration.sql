-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastSeenIp" TEXT;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "moderationFlagged" BOOLEAN,
ADD COLUMN "moderationScores" JSONB;

-- AlterTable
ALTER TABLE "RefereeReview" ADD COLUMN "moderationFlagged" BOOLEAN,
ADD COLUMN "moderationScores" JSONB;
