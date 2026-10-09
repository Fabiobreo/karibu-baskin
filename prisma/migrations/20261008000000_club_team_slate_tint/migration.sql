-- La Karibu di stagione ha la tinta dell'app (Ardesia), non scelta dallo staff.
-- Le Karibu nate prima della regola portano ancora un hex libero (es. un
-- arancio, che nella palette vuol dire "si tocca"): si allineano qui.
UPDATE "CompetitiveTeam" SET "color" = 'slate' WHERE "isMixed" = true AND "color" IS DISTINCT FROM 'slate';
