-- 신고자가 탈퇴해도 신고 기록(사유·대상)은 운영 검토용으로 남긴다.
-- 신고자를 비울 수 있게 하고, 계정 삭제 시 SET NULL로 처리한다.

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_reporterId_fkey";

-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "reporterId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
