-- Ultimo avviso mandato agli utenti per un evento, un post o un allenamento.
-- Serve alla spunta "Avvisa" (creare o pubblicare in silenzio) e ad "Avvisa di
-- nuovo": null vuol dire che non è mai partito nessun avviso.
ALTER TABLE "Event" ADD COLUMN "lastNotifiedAt" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN "lastNotifiedAt" TIMESTAMP(3);
ALTER TABLE "TrainingSession" ADD COLUMN "lastNotifiedAt" TIMESTAMP(3);

-- Storico: finora l'avviso partiva sempre (alla creazione dell'evento, alla
-- pubblicazione del post, all'apertura delle iscrizioni). Senza questo tutto il
-- pregresso risulterebbe "mai avvisato".
UPDATE "Event" SET "lastNotifiedAt" = "createdAt";
UPDATE "Post" SET "lastNotifiedAt" = "publishedAt" WHERE "publishedAt" IS NOT NULL;
UPDATE "TrainingSession" SET "lastNotifiedAt" = "registrationOpenedAt" WHERE "registrationOpenedAt" IS NOT NULL;
