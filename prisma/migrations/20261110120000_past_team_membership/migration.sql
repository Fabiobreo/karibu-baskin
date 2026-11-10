-- CreateTable
CREATE TABLE "PastTeamMembership" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "childId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PastTeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PastTeamMembership_teamId_idx" ON "PastTeamMembership"("teamId");

-- CreateIndex
CREATE INDEX "PastTeamMembership_userId_idx" ON "PastTeamMembership"("userId");

-- CreateIndex
CREATE INDEX "PastTeamMembership_childId_idx" ON "PastTeamMembership"("childId");

-- AddForeignKey
ALTER TABLE "PastTeamMembership" ADD CONSTRAINT "PastTeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "CompetitiveTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastTeamMembership" ADD CONSTRAINT "PastTeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastTeamMembership" ADD CONSTRAINT "PastTeamMembership_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Ricostruisce lo storico dal registro attività: ogni "Rimozione membro
-- squadra" diventa un periodo che finisce in quel momento. L'inizio è la
-- "Aggiunta membro squadra" della stessa riga, se c'è; altrimenti resta
-- sconosciuto (NULL). Si saltano squadre e persone che non esistono più.
INSERT INTO "PastTeamMembership" ("id", "teamId", "userId", "childId", "startedAt", "endedAt")
SELECT
  gen_random_uuid()::text,
  r."before"->>'teamId',
  CASE WHEN u."id" IS NOT NULL THEN u."id" END,
  CASE WHEN u."id" IS NULL THEN c."id" END,
  (
    SELECT MAX(a."createdAt")
    FROM "AuditEvent" a
    WHERE a."action" = 'ADD_MEMBER'
      AND a."targetId" = r."targetId"
      AND a."createdAt" <= r."createdAt"
  ),
  r."createdAt"
FROM "AuditEvent" r
JOIN "CompetitiveTeam" t ON t."id" = r."before"->>'teamId'
LEFT JOIN "User" u ON u."id" = r."before"->>'userId'
LEFT JOIN "Child" c ON c."id" = r."before"->>'childId'
WHERE r."action" = 'REMOVE_MEMBER'
  AND (u."id" IS NOT NULL OR c."id" IS NOT NULL);
