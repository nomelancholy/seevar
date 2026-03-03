-- User: ensure "xp" column (rename from "experience" if present, else add)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'experience') THEN
    ALTER TABLE "User" RENAME COLUMN "experience" TO "xp";
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'xp') THEN
    ALTER TABLE "User" ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Comment: ensure "xpDeductedOnHide" (rename from "xpPenaltyApplied" if present, else add)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Comment' AND column_name = 'xpPenaltyApplied') THEN
    ALTER TABLE "Comment" RENAME COLUMN "xpPenaltyApplied" TO "xpDeductedOnHide";
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Comment' AND column_name = 'xpDeductedOnHide') THEN
    ALTER TABLE "Comment" ADD COLUMN "xpDeductedOnHide" INTEGER;
  END IF;
END $$;

-- RefereeReview: ensure "xpDeductedOnHide" (rename from "xpPenaltyApplied" if present, else add)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'RefereeReview' AND column_name = 'xpPenaltyApplied') THEN
    ALTER TABLE "RefereeReview" RENAME COLUMN "xpPenaltyApplied" TO "xpDeductedOnHide";
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'RefereeReview' AND column_name = 'xpDeductedOnHide') THEN
    ALTER TABLE "RefereeReview" ADD COLUMN "xpDeductedOnHide" INTEGER;
  END IF;
END $$;
