-- AlterTable
ALTER TABLE "NoticeComment" ADD COLUMN "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "NoticeComment" ADD CONSTRAINT "NoticeComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NoticeComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
