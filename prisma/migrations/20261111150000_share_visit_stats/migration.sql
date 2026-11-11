-- CreateTable
CREATE TABLE "ShareVisitStat" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "campaign" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShareVisitStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShareVisitStat_day_campaign_source_key" ON "ShareVisitStat"("day", "campaign", "source");
