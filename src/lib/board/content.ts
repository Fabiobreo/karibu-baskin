import { COURT_CENTER, COURT_LENGTH, COURT_LINES, COURT_WIDTH, type Point } from "./court";

/**
 * Il disegno di uno schema della lavagna (UX-72), come sta in `Drill.content`.
 * Le pedine sono posti, non persone; le frecce non si salvano, si ricavano da
 * due passi consecutivi (`@/lib/board/arrows`). Coordinate in metri sul campo
 * intero (`@/lib/board/court`); la meta' campo e' la meta' di destra.
 */

export const DRILL_CONTENT_VERSION = 1;
export const MAX_PIECES = 24;
export const MAX_STEPS = 20;
export const MAX_SCREENS_PER_STEP = 5;
export const MAX_STEP_TEXT = 140;
export const MAX_NOTE_TEXT = 40;
export const MAX_FREE_LABEL = 2;

/** Le pedine e i materiali che si posano in campo. La palla sta nei passi. */
export const PIECE_KINDS = ["role", "free", "coach", "cone", "ring", "chair", "note"] as const;
export type PieceKind = (typeof PIECE_KINDS)[number];

export const PIECE_SIDES = ["attack", "defense"] as const;
export type PieceSide = (typeof PIECE_SIDES)[number];

export const COACH_KINDS = ["coach", "tutor"] as const;
export type CoachKind = (typeof COACH_KINDS)[number];

/**
 * Canestri a cui si tira. Nel Baskin ogni squadra usa il canestro laterale alla
 * propria destra: chi attacca il canestro grande di destra ha quello in basso.
 * Il canestro basso del Ruolo 1 sta sotto quello laterale: stesso punto.
 */
export const SHOT_TARGETS = ["rightMain", "leftMain", "bottomSide", "topSide"] as const;
export type ShotTarget = (typeof SHOT_TARGETS)[number];

/** Canestri a cui si tira a meta' campo (la meta' di destra). */
export const HALF_COURT_SHOTS: readonly ShotTarget[] = ["rightMain", "bottomSide"];

/** Linea di meta' campo: a meta' campo i pezzi stanno da qui a destra. */
export const HALF_COURT_MIN_X = COURT_CENTER.x;

export interface DrillPiece {
  id: string;
  kind: PieceKind;
  /** Per `role` e `free`: chi attacca (pedina piena) e chi difende (contornata). */
  side?: PieceSide;
  /** Solo `role`. */
  role?: 1 | 2 | 3 | 4 | 5;
  /** `free`: lettera o numero (2 caratteri); `note`: il testo (40). */
  label?: string;
  /** Solo `coach`. */
  coach?: CoachKind;
}

export type DrillBall = { holder: string } | { x: number; y: number } | { shot: ShotTarget };

export interface DrillScreen {
  from: string;
  to: Point;
}

export interface DrillStep {
  text?: string;
  /** Ogni pezzo ha la sua voce; `null` = fuori dal campo in questo passo. */
  at: Record<string, Point | null>;
  ball?: DrillBall;
  /** Blocchi: l'unica freccia che non nasce da uno spostamento. */
  screens?: DrillScreen[];
  /**
   * Percorsi ad arco per arrivare a questo passo dal precedente (UX-73): per
   * ogni pezzo che si sposta, il punto da cui passa a meta' strada
   * (`@/lib/board/curves`). Senza voce il percorso e' dritto.
   */
  curves?: Record<string, Point>;
  /** Lo stesso per la palla che arriva in questo passo (passaggio o tiro). */
  ballCurve?: Point;
}

export interface DrillContent {
  v: typeof DRILL_CONTENT_VERSION;
  pieces: DrillPiece[];
  steps: DrillStep[];
}

/** Dove sta il ferro di un canestro, in metri. */
export function shotTargetPoint(target: ShotTarget): Point {
  const { hoopFromBaseline, hoopR } = COURT_LINES;
  switch (target) {
    case "rightMain":
      return { x: COURT_LENGTH - hoopFromBaseline, y: COURT_CENTER.y };
    case "leftMain":
      return { x: hoopFromBaseline, y: COURT_CENTER.y };
    case "bottomSide":
      return { x: COURT_CENTER.x, y: COURT_WIDTH - hoopR };
    case "topSide":
      return { x: COURT_CENTER.x, y: hoopR };
  }
}

export function isInsideCourt(p: Point, half: boolean): boolean {
  const minX = half ? HALF_COURT_MIN_X : 0;
  return p.x >= minX && p.x <= COURT_LENGTH && p.y >= 0 && p.y <= COURT_WIDTH;
}

/** Il pezzo puo' portare la palla e prendere un nome? */
export function isPlayerPiece(piece: DrillPiece): boolean {
  return piece.kind === "role" || piece.kind === "free" || piece.kind === "coach";
}
