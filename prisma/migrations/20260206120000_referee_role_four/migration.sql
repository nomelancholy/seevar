-- RefereeRole enum을 REFEREE, ASSISTANCE, WAITING, VAR 4개로 변경
-- 기존 값 매핑: MAIN_REFEREE->REFEREE, ASSISTANT_*->ASSISTANCE, FOURTH_OFFICIAL/AVAR->WAITING, VAR->VAR

CREATE TYPE "RefereeRole_new" AS ENUM ('REFEREE', 'ASSISTANCE', 'WAITING', 'VAR');

ALTER TABLE "MatchReferee" ADD COLUMN "role_new" "RefereeRole_new";

UPDATE "MatchReferee" SET "role_new" = CASE
  WHEN "role"::text = 'MAIN_REFEREE' THEN 'REFEREE'::"RefereeRole_new"
  WHEN "role"::text IN ('ASSISTANT_REFEREE_1', 'ASSISTANT_REFEREE_2') THEN 'ASSISTANCE'::"RefereeRole_new"
  WHEN "role"::text IN ('FOURTH_OFFICIAL', 'AVAR') THEN 'WAITING'::"RefereeRole_new"
  WHEN "role"::text = 'VAR' THEN 'VAR'::"RefereeRole_new"
  ELSE 'REFEREE'::"RefereeRole_new"
END;

ALTER TABLE "MatchReferee" DROP COLUMN "role";
ALTER TABLE "MatchReferee" RENAME COLUMN "role_new" TO "role";
ALTER TABLE "MatchReferee" ALTER COLUMN "role" SET NOT NULL;

DROP TYPE "RefereeRole";
ALTER TYPE "RefereeRole_new" RENAME TO "RefereeRole";

-- unique 제약 복원 (DROP COLUMN 시 함께 제거되므로)
ALTER TABLE "MatchReferee" ADD CONSTRAINT "MatchReferee_matchId_refereeId_role_key" UNIQUE ("matchId", "refereeId", "role");
