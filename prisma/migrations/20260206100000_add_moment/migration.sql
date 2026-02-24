-- CreateTable
CREATE TABLE "Moment" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT,
    "description" TEXT,
    "startMinute" INTEGER,
    "endMinute" INTEGER,
    "mediaUrl" TEXT,
    "seeVarCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Moment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Moment_matchId_idx" ON "Moment"("matchId");

-- CreateIndex
CREATE INDEX "Moment_seeVarCount_idx" ON "Moment"("seeVarCount");

-- AddForeignKey
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
