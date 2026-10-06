-- Karibu di stagione iscritta al campionato: scelta per stagione dello staff.
-- false = comportamento di sempre (squadra nascosta, solo amichevoli e tornei).
ALTER TABLE "CompetitiveTeam" ADD COLUMN "playsLeague" BOOLEAN NOT NULL DEFAULT false;
