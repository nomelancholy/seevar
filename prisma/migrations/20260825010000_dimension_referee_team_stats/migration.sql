-- RefereeTeamStat is derived data. Rebuild it from matches and reviews so that
-- historical assignments, cards and ratings can be filtered by season/league/role.
BEGIN;

DELETE FROM "RefereeTeamStat";

DROP INDEX IF EXISTS "RefereeTeamStat_refereeId_teamId_key";

ALTER TABLE "RefereeTeamStat"
ADD COLUMN "seasonId" TEXT NOT NULL,
ADD COLUMN "leagueId" TEXT NOT NULL,
ADD COLUMN "role" "RefereeRole" NOT NULL,
ADD COLUMN "fanRatingCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "RefereeTeamStat_refereeId_teamId_seasonId_leagueId_role_key"
ON "RefereeTeamStat"("refereeId", "teamId", "seasonId", "leagueId", "role");

CREATE INDEX "RefereeTeamStat_teamId_seasonId_leagueId_role_idx"
ON "RefereeTeamStat"("teamId", "seasonId", "leagueId", "role");

CREATE INDEX "RefereeTeamStat_refereeId_seasonId_leagueId_role_idx"
ON "RefereeTeamStat"("refereeId", "seasonId", "leagueId", "role");

ALTER TABLE "RefereeTeamStat"
ADD CONSTRAINT "RefereeTeamStat_seasonId_fkey"
FOREIGN KEY ("seasonId") REFERENCES "Season"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefereeTeamStat"
ADD CONSTRAINT "RefereeTeamStat_leagueId_fkey"
FOREIGN KEY ("leagueId") REFERENCES "League"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- RefereeStats is also derived from MatchReferee. Rebuild it so assignments
-- created by the crawler before stats synchronization was added are included.
DELETE FROM "RefereeStats";

WITH referee_stat_aggregate AS (
  SELECT
    mr."refereeId",
    l."seasonId",
    rd."leagueId",
    mr."role",
    COUNT(*)::INTEGER AS match_count
  FROM "MatchReferee" mr
  JOIN "Match" m ON m."id" = mr."matchId"
  JOIN "Round" rd ON rd."id" = m."roundId"
  JOIN "League" l ON l."id" = rd."leagueId"
  GROUP BY mr."refereeId", l."seasonId", rd."leagueId", mr."role"
), referee_rating_aggregate AS (
  SELECT
    rr."refereeId",
    l."seasonId",
    rd."leagueId",
    rr."role",
    AVG(rr."rating")::DOUBLE PRECISION AS average_rating
  FROM "RefereeReview" rr
  JOIN "Match" m ON m."id" = rr."matchId"
  JOIN "Round" rd ON rd."id" = m."roundId"
  JOIN "League" l ON l."id" = rd."leagueId"
  WHERE rr."status" = 'VISIBLE'
  GROUP BY rr."refereeId", l."seasonId", rd."leagueId", rr."role"
)
INSERT INTO "RefereeStats" (
  "id",
  "refereeId",
  "seasonId",
  "leagueId",
  "role",
  "matchCount",
  "avgRating"
)
SELECT
  CONCAT('season-stat:', assignment_stat."refereeId", ':', assignment_stat."seasonId", ':', assignment_stat."leagueId", ':', assignment_stat."role"::TEXT),
  assignment_stat."refereeId",
  assignment_stat."seasonId",
  assignment_stat."leagueId",
  assignment_stat."role",
  assignment_stat.match_count,
  COALESCE(rating_stat.average_rating, 0)
FROM referee_stat_aggregate assignment_stat
LEFT JOIN referee_rating_aggregate rating_stat
  ON rating_stat."refereeId" = assignment_stat."refereeId"
  AND rating_stat."seasonId" = assignment_stat."seasonId"
  AND rating_stat."leagueId" = assignment_stat."leagueId"
  AND rating_stat."role" = assignment_stat."role";

WITH assignment_rows AS (
  SELECT
    mr."refereeId",
    m."homeTeamId" AS "teamId",
    l."seasonId",
    rd."leagueId",
    mr."role",
    mr."homeYellowCards" AS yellow_cards,
    mr."homeRedCards" AS red_cards
  FROM "MatchReferee" mr
  JOIN "Match" m ON m."id" = mr."matchId"
  JOIN "Round" rd ON rd."id" = m."roundId"
  JOIN "League" l ON l."id" = rd."leagueId"

  UNION ALL

  SELECT
    mr."refereeId",
    m."awayTeamId" AS "teamId",
    l."seasonId",
    rd."leagueId",
    mr."role",
    mr."awayYellowCards" AS yellow_cards,
    mr."awayRedCards" AS red_cards
  FROM "MatchReferee" mr
  JOIN "Match" m ON m."id" = mr."matchId"
  JOIN "Round" rd ON rd."id" = m."roundId"
  JOIN "League" l ON l."id" = rd."leagueId"
), assignment_aggregate AS (
  SELECT
    "refereeId",
    "teamId",
    "seasonId",
    "leagueId",
    "role",
    COUNT(*)::INTEGER AS assignment_count,
    COALESCE(SUM(yellow_cards), 0)::INTEGER AS yellow_cards,
    COALESCE(SUM(red_cards), 0)::INTEGER AS red_cards
  FROM assignment_rows
  GROUP BY "refereeId", "teamId", "seasonId", "leagueId", "role"
)
INSERT INTO "RefereeTeamStat" (
  "id",
  "refereeId",
  "teamId",
  "seasonId",
  "leagueId",
  "role",
  "totalAssignments",
  "roleCounts",
  "totalYellowCards",
  "totalRedCards",
  "fanAverageRating",
  "fanRatingCount"
)
SELECT
  CONCAT('assignment:', "refereeId", ':', "teamId", ':', "seasonId", ':', "leagueId", ':', "role"::TEXT),
  "refereeId",
  "teamId",
  "seasonId",
  "leagueId",
  "role",
  assignment_count,
  jsonb_build_object("role"::TEXT, assignment_count),
  yellow_cards,
  red_cards,
  0,
  0
FROM assignment_aggregate;

WITH rating_aggregate AS (
  SELECT
    rr."refereeId",
    rr."fanTeamId" AS "teamId",
    l."seasonId",
    rd."leagueId",
    rr."role",
    AVG(rr."rating")::DOUBLE PRECISION AS average_rating,
    COUNT(*)::INTEGER AS rating_count
  FROM "RefereeReview" rr
  JOIN "Match" m ON m."id" = rr."matchId"
  JOIN "Round" rd ON rd."id" = m."roundId"
  JOIN "League" l ON l."id" = rd."leagueId"
  WHERE rr."fanTeamId" IS NOT NULL
    AND rr."status" = 'VISIBLE'
  GROUP BY rr."refereeId", rr."fanTeamId", l."seasonId", rd."leagueId", rr."role"
)
INSERT INTO "RefereeTeamStat" (
  "id",
  "refereeId",
  "teamId",
  "seasonId",
  "leagueId",
  "role",
  "totalAssignments",
  "roleCounts",
  "totalYellowCards",
  "totalRedCards",
  "fanAverageRating",
  "fanRatingCount"
)
SELECT
  CONCAT('rating:', "refereeId", ':', "teamId", ':', "seasonId", ':', "leagueId", ':', "role"::TEXT),
  "refereeId",
  "teamId",
  "seasonId",
  "leagueId",
  "role",
  0,
  NULL,
  0,
  0,
  average_rating,
  rating_count
FROM rating_aggregate
ON CONFLICT ("refereeId", "teamId", "seasonId", "leagueId", "role")
DO UPDATE SET
  "fanAverageRating" = EXCLUDED."fanAverageRating",
  "fanRatingCount" = EXCLUDED."fanRatingCount";

COMMIT;
