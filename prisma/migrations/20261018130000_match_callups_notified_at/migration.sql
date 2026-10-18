-- "Avvisa i convocati": quando lo staff ha mandato a mano l'ultimo avviso.
ALTER TABLE "OfficialMatch" ADD COLUMN "callupsNotifiedAt" TIMESTAMP(3);
