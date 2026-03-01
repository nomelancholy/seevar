-- CreateTable
CREATE TABLE "RefereeReviewReply" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefereeReviewReply_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RefereeReviewReply" ADD CONSTRAINT "RefereeReviewReply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "RefereeReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeReviewReply" ADD CONSTRAINT "RefereeReviewReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
