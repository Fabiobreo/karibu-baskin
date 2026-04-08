-- Aggiunge teamId (opzionale) a TrainingSession per collegare alla squadra agonistica
ALTER TABLE "TrainingSession" ADD COLUMN "teamId" TEXT;

CREATE INDEX "TrainingSession_teamId_idx" ON "TrainingSession"("teamId");

ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "CompetitiveTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Crea tabella Event per eventi generici (tornei, bowling, ecc.)
CREATE TABLE "Event" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "date"        TIMESTAMP(3) NOT NULL,
    "endDate"     TIMESTAMP(3),
    "location"    TEXT,
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Event_date_idx" ON "Event"("date");
