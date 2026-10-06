-- Richiesta di collegamento a un figlio che ha già un account: la scheda figlio
-- nasce solo all'accettazione, quindi la richiesta può non averne ancora una.
ALTER TABLE "LinkRequest" ALTER COLUMN "childId" DROP NOT NULL;
