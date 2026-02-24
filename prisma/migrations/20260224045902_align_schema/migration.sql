/*
  Warnings:

  - The values [REFEREE,ASSISTANCE] on the enum `RefereeRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdAt` on the `League` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `League` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `League` table. All the data in the column will be lost.
  - You are about to drop the column `extraMinute` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `minute` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `averageRating` on the `Referee` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Referee` table. All the data in the column will be lost.
  - You are about to drop the column `matchesCount` on the `Referee` table. All the data in the column will be lost.
  - You are about to drop the column `totalRedCards` on the `Referee` table. All the data in the column will be lost.
  - You are about to drop the column `totalYellowCards` on the `Referee` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Referee` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Round` table. All the data in the column will be lost.
  - You are about to drop the column `endAt` on the `Round` table. All the data in the column will be lost.
  - You are about to drop the column `isFocus` on the `Round` table. All the data in the column will be lost.
  - You are about to drop the column `seasonId` on the `Round` table. All the data in the column will be lost.
  - You are about to drop the column `startAt` on the `Round` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Round` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Season` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Season` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Season` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `emblemPath` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `leagueId` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Team` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Team` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('VISIBLE', 'UNDER_REVIEW', 'PENDING_REAPPROVAL', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('ABUSE', 'SPAM', 'INAPPROPRIATE', 'FALSE_INFO');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'DISLIKE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MENTION', 'REPLY', 'LIKE_MOMENT', 'SYSTEM');

-- AlterEnum
ALTER TYPE "MatchStatus" ADD VALUE 'CANCELLED';

-- AlterEnum: REFEREE->MAIN, ASSISTANCE->ASSISTANT (DB has old enum values)
BEGIN;
CREATE TYPE "RefereeRole_new" AS ENUM ('MAIN', 'ASSISTANT', 'VAR', 'WAITING');
ALTER TABLE "MatchReferee" ALTER COLUMN "role" TYPE "RefereeRole_new" USING (
  CASE "role"::text
    WHEN 'REFEREE' THEN 'MAIN'::"RefereeRole_new"
    WHEN 'ASSISTANCE' THEN 'ASSISTANT'::"RefereeRole_new"
    WHEN 'WAITING' THEN 'WAITING'::"RefereeRole_new"
    WHEN 'VAR' THEN 'VAR'::"RefereeRole_new"
    ELSE 'MAIN'::"RefereeRole_new"
  END
);
ALTER TYPE "RefereeRole" RENAME TO "RefereeRole_old";
ALTER TYPE "RefereeRole_new" RENAME TO "RefereeRole";
DROP TYPE "public"."RefereeRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_roundId_fkey";

-- DropForeignKey
ALTER TABLE "Moment" DROP CONSTRAINT "Moment_matchId_fkey";

-- DropForeignKey
ALTER TABLE "Round" DROP CONSTRAINT "Round_leagueId_fkey";

-- DropForeignKey
ALTER TABLE "Round" DROP CONSTRAINT "Round_seasonId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_leagueId_fkey";

-- DropIndex
DROP INDEX "League_slug_key";

-- DropIndex
DROP INDEX "Match_playedAt_idx";

-- DropIndex
DROP INDEX "Match_roundId_idx";

-- DropIndex
DROP INDEX "Match_status_idx";

-- DropIndex
DROP INDEX "MatchReferee_matchId_idx";

-- DropIndex
DROP INDEX "MatchReferee_refereeId_idx";

-- DropIndex
DROP INDEX "Moment_matchId_idx";

-- DropIndex
DROP INDEX "Moment_seeVarCount_idx";

-- DropIndex
DROP INDEX "Referee_averageRating_idx";

-- DropIndex
DROP INDEX "Round_leagueId_isFocus_idx";

-- DropIndex
DROP INDEX "Round_leagueId_number_key";

-- DropIndex
DROP INDEX "Team_leagueId_idx";

-- DropIndex
DROP INDEX "Team_slug_key";

-- AlterTable
ALTER TABLE "League" DROP COLUMN "createdAt",
DROP COLUMN "slug",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "extraMinute",
DROP COLUMN "minute",
ADD COLUMN     "extraFirstHalfExtraTime" INTEGER DEFAULT 0,
ADD COLUMN     "extraSecondHalfExtraTime" INTEGER DEFAULT 0,
ADD COLUMN     "firstHalfExtraTime" INTEGER DEFAULT 0,
ADD COLUMN     "kleagueDataUrl" TEXT,
ADD COLUMN     "secondHalfExtraTime" INTEGER DEFAULT 0,
ALTER COLUMN "scoreHome" SET DEFAULT 0,
ALTER COLUMN "scoreAway" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "MatchReferee" ADD COLUMN     "awayRedCards" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "awayYellowCards" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "homeRedCards" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "homeYellowCards" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Moment" ADD COLUMN     "dislikeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Referee" DROP COLUMN "averageRating",
DROP COLUMN "createdAt",
DROP COLUMN "matchesCount",
DROP COLUMN "totalRedCards",
DROP COLUMN "totalYellowCards",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Round" DROP COLUMN "createdAt",
DROP COLUMN "endAt",
DROP COLUMN "isFocus",
DROP COLUMN "seasonId",
DROP COLUMN "startAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Season" DROP COLUMN "createdAt",
DROP COLUMN "name",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "createdAt",
DROP COLUMN "emblemPath",
DROP COLUMN "leagueId",
DROP COLUMN "slug",
DROP COLUMN "updatedAt",
ADD COLUMN     "emblem" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastTeamChangeAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RefereeStats" (
    "id" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "role" "RefereeRole" NOT NULL,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "RefereeStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefereeTeamStat" (
    "id" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "totalAssignments" INTEGER NOT NULL DEFAULT 0,
    "roleCounts" JSONB,
    "totalYellowCards" INTEGER NOT NULL DEFAULT 0,
    "totalRedCards" INTEGER NOT NULL DEFAULT 0,
    "fanAverageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "RefereeTeamStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefereeReview" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fanTeamId" TEXT,
    "rating" DOUBLE PRECISION NOT NULL,
    "comment" VARCHAR(100),
    "role" "RefereeRole" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'VISIBLE',
    "filterReason" TEXT,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefereeReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'VISIBLE',
    "filterReason" TEXT,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "reviewId" TEXT,
    "commentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "momentId" TEXT,
    "commentId" TEXT,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "content" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LeagueToTeam" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LeagueToTeam_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefereeStats_refereeId_seasonId_leagueId_role_key" ON "RefereeStats"("refereeId", "seasonId", "leagueId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RefereeTeamStat_refereeId_teamId_key" ON "RefereeTeamStat"("refereeId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "RefereeReview_matchId_refereeId_userId_key" ON "RefereeReview"("matchId", "refereeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_momentId_commentId_key" ON "Reaction"("userId", "momentId", "commentId");

-- CreateIndex
CREATE INDEX "_LeagueToTeam_B_index" ON "_LeagueToTeam"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeStats" ADD CONSTRAINT "RefereeStats_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeStats" ADD CONSTRAINT "RefereeStats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeStats" ADD CONSTRAINT "RefereeStats_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeTeamStat" ADD CONSTRAINT "RefereeTeamStat_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeTeamStat" ADD CONSTRAINT "RefereeTeamStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeReview" ADD CONSTRAINT "RefereeReview_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeReview" ADD CONSTRAINT "RefereeReview_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "Referee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeReview" ADD CONSTRAINT "RefereeReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeReview" ADD CONSTRAINT "RefereeReview_fanTeamId_fkey" FOREIGN KEY ("fanTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "RefereeReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeagueToTeam" ADD CONSTRAINT "_LeagueToTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LeagueToTeam" ADD CONSTRAINT "_LeagueToTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
