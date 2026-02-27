/*
  Warnings:

  - A unique constraint covering the columns `[userId,reviewId]` on the table `Reaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Reaction" ADD COLUMN     "reviewId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_reviewId_key" ON "Reaction"("userId", "reviewId");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "RefereeReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
