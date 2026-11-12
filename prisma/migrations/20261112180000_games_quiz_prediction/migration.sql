-- UX-61: giochi del club (quiz del Baskin e pronostico della partita)
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "quizBest" INTEGER;

-- CreateTable
CREATE TABLE "MatchPrediction" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outcome" "MatchResult" NOT NULL,
    "ourScore" INTEGER,
    "theirScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameDailyStat" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "game" TEXT NOT NULL,
    "plays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GameDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchPrediction_userId_idx" ON "MatchPrediction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPrediction_matchId_userId_key" ON "MatchPrediction"("matchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameDailyStat_day_game_key" ON "GameDailyStat"("day", "game");

-- AddForeignKey
ALTER TABLE "MatchPrediction" ADD CONSTRAINT "MatchPrediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "OfficialMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPrediction" ADD CONSTRAINT "MatchPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

