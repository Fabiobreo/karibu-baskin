-- Un figlio può avere più genitori, tutti paritari (tabella ChildGuardian).
-- Il genitore unico di oggi (Child.parentId) diventa il primo collegamento,
-- poi la colonna sparisce: l'ordine delle istruzioni conta, la copia deve
-- avvenire prima del DROP COLUMN.

-- CreateTable
CREATE TABLE "ChildGuardian" (
    "childId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildGuardian_pkey" PRIMARY KEY ("childId","userId")
);

-- CreateIndex
CREATE INDEX "ChildGuardian_userId_idx" ON "ChildGuardian"("userId");

-- AddForeignKey
ALTER TABLE "ChildGuardian" ADD CONSTRAINT "ChildGuardian_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildGuardian" ADD CONSTRAINT "ChildGuardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: ogni figlio mantiene il suo genitore attuale, con la data di
-- creazione del figlio (così resta il "primo" nell'ordinamento).
INSERT INTO "ChildGuardian" ("childId", "userId", "createdAt")
SELECT "id", "parentId", "createdAt" FROM "Child";

-- DropForeignKey
ALTER TABLE "Child" DROP CONSTRAINT "Child_parentId_fkey";

-- DropIndex
DROP INDEX "Child_parentId_idx";

-- AlterTable
ALTER TABLE "Child" DROP COLUMN "parentId";
