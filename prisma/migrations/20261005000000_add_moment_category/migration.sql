-- 쟁점 순간의 판정 유형(선택). 기존 행은 미분류(NULL)로 남는다.
ALTER TABLE "Moment" ADD COLUMN "category" TEXT;
