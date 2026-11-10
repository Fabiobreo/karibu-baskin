import { z } from "zod";

export const GroupCreateSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio").max(200),
  season: z.string().regex(/^\d{4}-\d{2}$/, 'Stagione in formato YYYY-YY (es. "2025-26")'),
  championship: z.string().max(200).optional(),
});

export const GroupCompetitiveTeamCreateSchema = z.object({
  competitiveTeamId: z.string().min(1, "competitiveTeamId obbligatorio"),
});

export const GroupUpdateSchema = z.object({
  name: z.string().min(1, "Il nome non può essere vuoto").max(200).optional(),
  championship: z.string().max(200).nullable().optional(),
});

export const GroupMatchCreateSchema = z
  .object({
    homeTeamId: z.string().min(1, "homeTeamId obbligatorio"),
    awayTeamId: z.string().min(1, "awayTeamId obbligatorio"),
    matchday: z.number().int().min(1).nullable().optional(),
    date: z.string().nullable().optional(),
    homeScore: z.number().int().min(0).nullable().optional(),
    awayScore: z.number().int().min(0).nullable().optional(),
  })
  .refine((b) => b.homeTeamId !== b.awayTeamId, {
    message: "Le squadre devono essere diverse",
  });

export const GroupMatchUpdateSchema = z
  .object({
    homeTeamId: z.string().min(1).optional(),
    awayTeamId: z.string().min(1).optional(),
    matchday: z.number().int().min(1).nullable().optional(),
    date: z.string().nullable().optional(),
    homeScore: z.number().int().min(0).nullable().optional(),
    awayScore: z.number().int().min(0).nullable().optional(),
  })
  .refine(
    (b) =>
      b.homeTeamId === undefined || b.awayTeamId === undefined || b.homeTeamId !== b.awayTeamId,
    { message: "Le squadre devono essere diverse" }
  );

// ── Import dal foglio EISI (POST /api/groups/[groupId]/sheet-import) ─────────

const SheetNameTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ours"), teamId: z.string().min(1) }),
  z.object({ kind: z.literal("opponent"), opposingTeamId: z.string().min(1) }),
  z.object({ kind: z.literal("new") }),
  z.object({ kind: z.literal("skip") }),
]);

export const GroupSheetImportSchema = z
  .object({
    /** Foglio Google pubblicato (fino alla stagione 2025-26). */
    url: z.string().trim().max(500).optional(),
    /** Girone del sito eisi.it (SportsPress), dalla stagione 2026-27. */
    eisiLeagueId: z.number().int().positive().optional(),
    /** Abbinamento scelto per ogni nome del foglio; quelli mancanti si propongono. */
    names: z.record(z.string().max(200), SheetNameTargetSchema).optional(),
    /** Numeri di gara in conflitto per cui vale il punteggio del foglio. */
    useSheetScore: z.array(z.number().int().positive()).max(500).optional(),
    /** Le partite già salvate tengono la loro giornata. */
    keepMatchdays: z.boolean().optional(),
    /** false o assente = solo anteprima. */
    apply: z.boolean().optional(),
  })
  .refine((b) => !!b.url || b.eisiLeagueId !== undefined, {
    message: "Scegli il girone del sito EISI o incolla il link del foglio",
  });
