-- AlterTable: add public profile handle (email local part, e.g. starmekey from starmekey@naver.com)
ALTER TABLE "User" ADD COLUMN "handle" TEXT;

-- Backfill handle from email (local part before @), lowercase. Duplicates get suffix _2, _3, ...
WITH ordered AS (
  SELECT id, LOWER(SPLIT_PART(email, '@', 1)) AS base_handle,
         ROW_NUMBER() OVER (PARTITION BY LOWER(SPLIT_PART(email, '@', 1)) ORDER BY "createdAt") AS rn
  FROM "User"
  WHERE email IS NOT NULL AND TRIM(email) <> ''
),
with_handle AS (
  SELECT id, CASE WHEN rn = 1 THEN base_handle ELSE base_handle || '_' || rn END AS h
  FROM ordered
)
UPDATE "User" u SET handle = with_handle.h
FROM with_handle WHERE u.id = with_handle.id;

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "User_handle_key" ON "User"("handle");
