-- CreateTable
CREATE TABLE "PushDailyStat" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "opened" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PushDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyActivityStat" (
    "id" TEXT NOT NULL,
    "weekEnd" DATE NOT NULL,
    "families" INTEGER NOT NULL,
    "activeFamilies" INTEGER NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyActivityStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushDailyStat_day_type_key" ON "PushDailyStat"("day", "type");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyActivityStat_weekEnd_key" ON "WeeklyActivityStat"("weekEnd");

