-- Keep referee master records and historical assignments independent from yearly activity.
CREATE TABLE "RefereeSeason" (
    "id" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefereeSeason_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefereeSeason_refereeId_seasonId_key"
ON "RefereeSeason"("refereeId", "seasonId");

CREATE INDEX "RefereeSeason_seasonId_idx" ON "RefereeSeason"("seasonId");

ALTER TABLE "RefereeSeason"
ADD CONSTRAINT "RefereeSeason_refereeId_fkey"
FOREIGN KEY ("refereeId") REFERENCES "Referee"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefereeSeason"
ADD CONSTRAINT "RefereeSeason_seasonId_fkey"
FOREIGN KEY ("seasonId") REFERENCES "Season"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the pre-migration behavior: every existing referee remains available
-- in every season that already exists. Future seasons start with an empty roster.
INSERT INTO "RefereeSeason" ("id", "refereeId", "seasonId", "updatedAt")
SELECT CONCAT('legacy:', r."id", ':', s."id"), r."id", s."id", CURRENT_TIMESTAMP
FROM "Referee" r
CROSS JOIN "Season" s
ON CONFLICT ("refereeId", "seasonId") DO NOTHING;
