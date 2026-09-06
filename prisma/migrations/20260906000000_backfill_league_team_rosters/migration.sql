-- Build the initial yearly team rosters from the league matches that already
-- exist. If legacy data contains an isolated cross-league anomaly, keep the
-- league in which the team has the most appearances for that season.
WITH team_appearances AS (
    SELECT
        l."seasonId",
        l."id" AS "leagueId",
        m."homeTeamId" AS "teamId"
    FROM "Match" m
    JOIN "Round" r ON r."id" = m."roundId"
    JOIN "League" l ON l."id" = r."leagueId"

    UNION ALL

    SELECT
        l."seasonId",
        l."id" AS "leagueId",
        m."awayTeamId" AS "teamId"
    FROM "Match" m
    JOIN "Round" r ON r."id" = m."roundId"
    JOIN "League" l ON l."id" = r."leagueId"
),
league_counts AS (
    SELECT
        "seasonId",
        "leagueId",
        "teamId",
        COUNT(*) AS appearances
    FROM team_appearances
    GROUP BY "seasonId", "leagueId", "teamId"
),
ranked_rosters AS (
    SELECT
        "leagueId",
        "teamId",
        ROW_NUMBER() OVER (
            PARTITION BY "seasonId", "teamId"
            ORDER BY appearances DESC, "leagueId" ASC
        ) AS roster_rank
    FROM league_counts
)
INSERT INTO "_LeagueToTeam" ("A", "B")
SELECT "leagueId", "teamId"
FROM ranked_rosters
WHERE roster_rank = 1
ON CONFLICT ("A", "B") DO NOTHING;
