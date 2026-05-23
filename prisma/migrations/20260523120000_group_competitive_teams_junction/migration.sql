-- Sostituisce la relazione 1-a-1 Group.teamId → CompetitiveTeam con una junction
-- GroupCompetitiveTeam (N a N), così più nostre squadre possono partecipare allo
-- stesso girone. I dati esistenti (un teamId per Group) vengono migrati come righe
-- nella junction prima di droppare la colonna.

-- 1) Crea la tabella junction
CREATE TABLE "GroupCompetitiveTeam" (
    "id"                TEXT NOT NULL,
    "groupId"           TEXT NOT NULL,
    "competitiveTeamId" TEXT NOT NULL,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupCompetitiveTeam_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupCompetitiveTeam_groupId_competitiveTeamId_key"
    ON "GroupCompetitiveTeam"("groupId", "competitiveTeamId");
CREATE INDEX "GroupCompetitiveTeam_groupId_idx"
    ON "GroupCompetitiveTeam"("groupId");
CREATE INDEX "GroupCompetitiveTeam_competitiveTeamId_idx"
    ON "GroupCompetitiveTeam"("competitiveTeamId");

ALTER TABLE "GroupCompetitiveTeam" ADD CONSTRAINT "GroupCompetitiveTeam_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupCompetitiveTeam" ADD CONSTRAINT "GroupCompetitiveTeam_competitiveTeamId_fkey"
    FOREIGN KEY ("competitiveTeamId") REFERENCES "CompetitiveTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Migra i dati esistenti: ogni Group.teamId diventa una riga in junction.
-- gen_random_uuid() richiede pgcrypto; cuid-like via md5(random) per evitare extension.
INSERT INTO "GroupCompetitiveTeam" ("id", "groupId", "competitiveTeamId", "createdAt")
SELECT
    'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
    "id",
    "teamId",
    "createdAt"
FROM "Group"
WHERE "teamId" IS NOT NULL;

-- 3) Droppa FK, index e colonna teamId da Group
ALTER TABLE "Group" DROP CONSTRAINT IF EXISTS "Group_teamId_fkey";
DROP INDEX IF EXISTS "Group_teamId_idx";
ALTER TABLE "Group" DROP COLUMN "teamId";
