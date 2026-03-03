-- Drop unused columns: User.whistleBalance, Moment.likeCount/dislikeCount (Match.kleagueDataUrl 유지)
ALTER TABLE "User" DROP COLUMN IF EXISTS "whistleBalance";
ALTER TABLE "Moment" DROP COLUMN IF EXISTS "likeCount", DROP COLUMN IF EXISTS "dislikeCount";
