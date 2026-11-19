-- CreateEnum
CREATE TYPE "DrillKind" AS ENUM ('ATTACK', 'DEFENSE', 'TRANSITION', 'SET_PLAY', 'EXERCISE', 'WARMUP');

-- CreateEnum
CREATE TYPE "DrillCourt" AS ENUM ('FULL', 'HALF');

-- CreateEnum
CREATE TYPE "DrillStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Drill" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "DrillKind" NOT NULL,
    "court" "DrillCourt" NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER,
    "competitiveTeamId" TEXT,
    "status" "DrillStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingDrill" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "drillId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "note" TEXT,
    "assignments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingDrill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Drill_slug_key" ON "Drill"("slug");

-- CreateIndex
CREATE INDEX "Drill_status_archivedAt_idx" ON "Drill"("status", "archivedAt");

-- CreateIndex
CREATE INDEX "Drill_competitiveTeamId_idx" ON "Drill"("competitiveTeamId");

-- CreateIndex
CREATE INDEX "TrainingDrill_drillId_idx" ON "TrainingDrill"("drillId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingDrill_sessionId_drillId_key" ON "TrainingDrill"("sessionId", "drillId");

-- AddForeignKey
ALTER TABLE "Drill" ADD CONSTRAINT "Drill_competitiveTeamId_fkey" FOREIGN KEY ("competitiveTeamId") REFERENCES "CompetitiveTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drill" ADD CONSTRAINT "Drill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drill" ADD CONSTRAINT "Drill_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingDrill" ADD CONSTRAINT "TrainingDrill_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingDrill" ADD CONSTRAINT "TrainingDrill_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "Drill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

