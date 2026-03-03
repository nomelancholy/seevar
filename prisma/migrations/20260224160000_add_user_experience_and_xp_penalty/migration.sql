-- AlterTable User: add experience
ALTER TABLE "User" ADD COLUMN "experience" INTEGER NOT NULL DEFAULT 0;

-- AlterTable Comment: add xpPenaltyApplied (for restore on re-approval)
ALTER TABLE "Comment" ADD COLUMN "xpPenaltyApplied" INTEGER;

-- AlterTable RefereeReview: add xpPenaltyApplied
ALTER TABLE "RefereeReview" ADD COLUMN "xpPenaltyApplied" INTEGER;
