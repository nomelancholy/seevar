-- AlterTable (Report: add reviewReplyId)
ALTER TABLE "Report" ADD COLUMN "reviewReplyId" TEXT;

-- AlterTable (Reaction: add reviewReplyId)
ALTER TABLE "Reaction" ADD COLUMN "reviewReplyId" TEXT;

-- CreateIndex (unique for Reaction.reviewReplyId)
CREATE UNIQUE INDEX "Reaction_userId_reviewReplyId_key" ON "Reaction"("userId", "reviewReplyId");

-- AddForeignKey (Report.reviewReplyId -> RefereeReviewReply)
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewReplyId_fkey" FOREIGN KEY ("reviewReplyId") REFERENCES "RefereeReviewReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (Reaction.reviewReplyId -> RefereeReviewReply)
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_reviewReplyId_fkey" FOREIGN KEY ("reviewReplyId") REFERENCES "RefereeReviewReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
