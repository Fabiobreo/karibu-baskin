import { z } from "zod";
import {
  COACH_KINDS,
  DRILL_CONTENT_VERSION,
  HALF_COURT_SHOTS,
  MAX_FREE_LABEL,
  MAX_NOTE_TEXT,
  MAX_PIECES,
  MAX_SCREENS_PER_STEP,
  MAX_STEP_TEXT,
  MAX_STEPS,
  PIECE_KINDS,
  PIECE_SIDES,
  SHOT_TARGETS,
  isInsideCourt,
  isPlayerPiece,
  type DrillContent,
} from "@/lib/board/content";
import { COURT_LENGTH, COURT_WIDTH } from "@/lib/board/court";

/**
 * Schemi della lavagna (UX-72). I messaggi sono per lo staff, in italiano: il
 * pannello resta solo in italiano.
 */

export const DRILL_KINDS = [
  "ATTACK",
  "DEFENSE",
  "TRANSITION",
  "SET_PLAY",
  "EXERCISE",
  "WARMUP",
] as const;
export const DRILL_COURTS = ["FULL", "HALF"] as const;
export const DRILL_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export const DRILL_VISIBILITIES = ["MEMBERS", "PUBLIC"] as const;
export type DrillCourtValue = (typeof DRILL_COURTS)[number];

const MAX_TITLE = 80;
const MAX_DESCRIPTION = 600;
const MAX_TRAINING_NOTE = 140;
const MAX_TRAINING_DRILLS = 12;

const pieceId = z.string().regex(/^[a-z0-9]{1,8}$/, "Pezzo non valido");
// Due decimali bastano (un centimetro) e tengono piccolo il JSON.
const meters = (max: number) =>
  z
    .number()
    .finite()
    .min(0)
    .max(max)
    .transform((n) => Math.round(n * 100) / 100);
const point = z.object({ x: meters(COURT_LENGTH), y: meters(COURT_WIDTH) });

const PieceSchema = z.object({
  id: pieceId,
  kind: z.enum(PIECE_KINDS),
  side: z.enum(PIECE_SIDES).optional(),
  role: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  label: z.string().trim().max(MAX_NOTE_TEXT).optional(),
  coach: z.enum(COACH_KINDS).optional(),
});

const BallSchema = z.union([
  z.object({ holder: pieceId }),
  z.object({ shot: z.enum(SHOT_TARGETS) }),
  point,
]);

const StepSchema = z.object({
  text: z
    .string()
    .trim()
    .max(MAX_STEP_TEXT, `Al massimo ${MAX_STEP_TEXT} caratteri per passo`)
    .optional(),
  at: z.record(pieceId, point.nullable()),
  ball: BallSchema.optional(),
  screens: z
    .array(z.object({ from: pieceId, to: point }))
    .max(MAX_SCREENS_PER_STEP, `Al massimo ${MAX_SCREENS_PER_STEP} blocchi per passo`)
    .optional(),
});

/**
 * Il contenuto di uno schema con i controlli che legano pezzi e passi. Va
 * validato insieme al campo (`court`), perche' a meta' campo i pezzi stanno
 * solo nella meta' di destra: per questo e' una funzione.
 */
export function drillContentSchema(court: DrillCourtValue) {
  const half = court === "HALF";
  return z
    .object({
      v: z.literal(DRILL_CONTENT_VERSION),
      pieces: z.array(PieceSchema).max(MAX_PIECES, `Al massimo ${MAX_PIECES} pezzi`),
      steps: z
        .array(StepSchema)
        .min(1, "Serve almeno un passo")
        .max(MAX_STEPS, `Al massimo ${MAX_STEPS} passi`),
    })
    .superRefine((content, ctx) => {
      const issue = (message: string, path: (string | number)[]) =>
        ctx.addIssue({ code: "custom", message, path });
      const byId = new Map(content.pieces.map((p) => [p.id, p]));
      if (byId.size !== content.pieces.length) issue("Due pezzi con lo stesso codice", ["pieces"]);

      content.pieces.forEach((p, i) => {
        const path = ["pieces", i];
        const needsSide = p.kind === "role" || p.kind === "free";
        if (needsSide !== (p.side !== undefined)) issue("Attacco o difesa non valido", path);
        if ((p.kind === "role") !== (p.role !== undefined)) issue("Ruolo non valido", path);
        if ((p.kind === "coach") !== (p.coach !== undefined)) issue("Allenatore non valido", path);
        if (p.kind === "free" && (!p.label || p.label.length > MAX_FREE_LABEL)) {
          issue(`Scrivi una lettera o un numero (al massimo ${MAX_FREE_LABEL})`, path);
        }
        if (p.kind === "note" && !p.label) issue("Scrivi il testo della nota", path);
        if (p.label !== undefined && p.kind !== "free" && p.kind !== "note") {
          issue("Testo non previsto per questo pezzo", path);
        }
      });

      content.steps.forEach((step, s) => {
        const ids = Object.keys(step.at);
        if (ids.length !== byId.size || ids.some((id) => !byId.has(id))) {
          issue("Ogni passo deve dire dove sta ogni pezzo", ["steps", s, "at"]);
        }
        const onCourt = (id: string) => step.at[id] != null;
        for (const [id, p] of Object.entries(step.at)) {
          if (p && !isInsideCourt(p, half))
            issue("Pezzo fuori dalla meta' campo", ["steps", s, "at", id]);
        }
        const ball = step.ball;
        if (ball && "holder" in ball) {
          const holder = byId.get(ball.holder);
          if (!holder || !isPlayerPiece(holder) || !onCourt(ball.holder)) {
            issue("La palla deve essere in mano a un giocatore in campo", ["steps", s, "ball"]);
          }
        } else if (ball && "shot" in ball) {
          if (half && !HALF_COURT_SHOTS.includes(ball.shot)) {
            issue("A meta' campo si tira solo nei canestri di destra", ["steps", s, "ball"]);
          }
          if (s === 0) issue("Il primo passo non puo' essere un tiro", ["steps", s, "ball"]);
        } else if (ball && !isInsideCourt(ball, half)) {
          issue("Palla fuori dalla meta' campo", ["steps", s, "ball"]);
        }
        step.screens?.forEach((sc, j) => {
          const from = byId.get(sc.from);
          if (!from || !isPlayerPiece(from) || !onCourt(sc.from)) {
            issue("Il blocco parte da un giocatore in campo", ["steps", s, "screens", j]);
          }
          if (!isInsideCourt(sc.to, half))
            issue("Blocco fuori dalla meta' campo", ["steps", s, "screens", j]);
        });
      });
    }) satisfies z.ZodType<DrillContent, unknown>;
}

/** Contenuto di uno schema appena creato: nessun pezzo, un passo vuoto. */
export const EMPTY_DRILL_CONTENT: DrillContent = {
  v: DRILL_CONTENT_VERSION,
  pieces: [],
  steps: [{ at: {} }],
};

/** Il contenuto salvato, o `null` se il JSON non e' valido. */
export function parseDrillContent(value: unknown, court: DrillCourtValue): DrillContent | null {
  const result = drillContentSchema(court).safeParse(value);
  return result.success ? result.data : null;
}

const title = z
  .string()
  .trim()
  .min(1, "Scrivi il titolo")
  .max(MAX_TITLE, `Al massimo ${MAX_TITLE} caratteri`);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Al massimo ${max} caratteri`)
    .nullish()
    .transform((v) => (v ? v : null));
const durationMin = z
  .int({ message: "Durata non valida" })
  .min(1, "Durata non valida")
  .max(120, "Al massimo 120 minuti")
  .nullish()
  .transform((v) => v ?? null);
const teamId = z
  .string()
  .min(1)
  .nullish()
  .transform((v) => v ?? null);

export const DrillCreateSchema = z.object({
  title,
  kind: z.enum(DRILL_KINDS, { message: "Scegli il tipo" }),
  court: z.enum(DRILL_COURTS, { message: "Scegli il campo" }),
  description: optionalText(MAX_DESCRIPTION),
  durationMin,
  competitiveTeamId: teamId,
  /** Solo per gli esercizi (lo controlla la rotta): pubblico per scelta. */
  visibility: z.enum(DRILL_VISIBILITIES).optional(),
});

/**
 * Modifica: tutti i campi facoltativi. Il contenuto si ricontrolla nella rotta
 * con `drillContentSchema`, contro il campo salvato o quello nuovo.
 */
// Nella modifica un campo assente resta com'e' (undefined, Prisma non lo
// tocca) e solo `null` o il vuoto lo cancellano. Con `.optional()` sopra gli
// schemi della creazione Zod v4 farebbe girare la trasformazione anche su un
// campo assente, e ogni "Salva" dell'editor azzererebbe descrizione, durata
// e squadra.
const clearable = <T>(schema: z.ZodType<T>, empty: (v: T) => boolean = () => false) =>
  schema
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === null || empty(v) ? null : v));

export const DrillUpdateSchema = z.object({
  title: title.optional(),
  kind: z.enum(DRILL_KINDS).optional(),
  court: z.enum(DRILL_COURTS).optional(),
  description: clearable(
    z.string().trim().max(MAX_DESCRIPTION, `Al massimo ${MAX_DESCRIPTION} caratteri`),
    (v) => v === ""
  ),
  durationMin: clearable(
    z
      .int({ message: "Durata non valida" })
      .min(1, "Durata non valida")
      .max(120, "Al massimo 120 minuti")
  ),
  competitiveTeamId: clearable(z.string(), (v) => v === ""),
  status: z.enum(DRILL_STATUSES).optional(),
  visibility: z.enum(DRILL_VISIBILITIES).optional(),
  content: z.unknown().optional(),
});

/**
 * Scambi di nomi fatti dallo staff, per squadra dell'allenamento: chiave della
 * squadra (`teamA`, `teamB`, `teamC`) → pezzo → id dell'atleta nelle squadre.
 */
// `partialRecord`: con le chiavi da un enum, `record` le vorrebbe tutte e tre.
export const DrillAssignmentsSchema = z.partialRecord(
  z.enum(["teamA", "teamB", "teamC"]),
  z.record(pieceId, z.string().min(1))
);
export type DrillAssignments = z.infer<typeof DrillAssignmentsSchema>;

/** Scaletta di un allenamento: sostituzione in blocco, nell'ordine dato. */
export const TrainingDrillsSchema = z
  .array(
    z.object({
      drillId: z.string().min(1),
      note: optionalText(MAX_TRAINING_NOTE),
      assignments: DrillAssignmentsSchema.nullish().transform((v) => v ?? null),
    })
  )
  .max(MAX_TRAINING_DRILLS, `Al massimo ${MAX_TRAINING_DRILLS} schemi per allenamento`)
  .refine((list) => new Set(list.map((d) => d.drillId)).size === list.length, {
    message: "Lo stesso schema due volte",
  });

// ── Proposte dei tesserati (UX-73) ──────────────────────────────────────────

/** Solo esercizi: gli schemi da partita restano dello staff. */
export const PROPOSAL_KINDS = ["WARMUP", "EXERCISE"] as const;

const proposalKind = z
  .enum(DRILL_KINDS)
  .refine((k) => (PROPOSAL_KINDS as readonly string[]).includes(k), {
    message: "Si propongono solo esercizi: gli schemi da partita li disegna lo staff",
  });

/** Nuova proposta: titolo, tipo, campo, e se si vuole gia' la descrizione. */
export const ProposalCreateSchema = z.object({
  title,
  kind: proposalKind,
  court: z.enum(DRILL_COURTS, { message: "Scegli il campo" }),
  description: optionalText(MAX_DESCRIPTION),
  showAuthor: z.boolean().optional(),
});

/** Modifica dell'autore: niente squadra, durata, visibilita' o stato. */
export const ProposalUpdateSchema = z.object({
  title: title.optional(),
  kind: proposalKind.optional(),
  court: z.enum(DRILL_COURTS).optional(),
  description: clearable(
    z.string().trim().max(MAX_DESCRIPTION, `Al massimo ${MAX_DESCRIPTION} caratteri`),
    (v) => v === ""
  ),
  showAuthor: z.boolean().optional(),
  content: z.unknown().optional(),
});
