import type { Point } from "./court";
import { shotTargetPoint, type DrillContent, type DrillStep } from "./content";

/**
 * Le frecce della lavagna (UX-72) non si disegnano: nascono dalla differenza
 * fra un passo e il successivo. L'allenatore sposta le pedine, e
 * - chi si sposta senza palla fa un movimento (freccia piena);
 * - chi si sposta con la palla, e la tiene, palleggia (ondulata);
 * - la palla che cambia mano e' un passaggio (tratteggiata);
 * - la palla che va a canestro e' un tiro (tratteggiata, punta piena).
 * I blocchi sono l'unica freccia scritta a mano, e appartengono al passo.
 */

export type ArrowKind = "move" | "dribble" | "pass" | "shot" | "screen";

export interface BoardArrow {
  kind: ArrowKind;
  from: Point;
  to: Point;
  /** Il pezzo che si muove o che blocca; per passaggi e tiri chi ha la palla. */
  pieceId?: string;
  /** Percorso ad arco: il punto da cui passa a meta' strada (`@/lib/board/curves`). */
  via?: Point;
}

/** Sotto i 10 cm non e' uno spostamento: e' la mano che trema sul telefono. */
export const MIN_MOVE = 0.1;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Chi ha la palla in un passo, se ce l'ha qualcuno. */
export function ballHolder(step: DrillStep): string | null {
  return step.ball && "holder" in step.ball ? step.ball.holder : null;
}

/** Dove sta la palla in un passo, date le posizioni dei pezzi. */
export function ballPoint(
  step: DrillStep,
  at: Record<string, Point | null> = step.at
): Point | null {
  const ball = step.ball;
  if (!ball) return null;
  if ("holder" in ball) return at[ball.holder] ?? null;
  if ("shot" in ball) return shotTargetPoint(ball.shot);
  return { x: ball.x, y: ball.y };
}

/** I blocchi disegnati in un passo. */
export function stepScreens(step: DrillStep): BoardArrow[] {
  return (step.screens ?? []).flatMap((sc) => {
    const from = step.at[sc.from];
    return from ? [{ kind: "screen" as const, from, to: sc.to, pieceId: sc.from }] : [];
  });
}

/**
 * Le frecce dal passo `index` al successivo, piu' i blocchi del passo. Sul
 * ultimo passo restano solo i blocchi.
 */
export function deriveArrows(content: DrillContent, index: number): BoardArrow[] {
  const step = content.steps[index];
  if (!step) return [];
  const arrows = stepScreens(step);
  const next = content.steps[index + 1];
  if (!next) return arrows;

  const holder = ballHolder(step);
  const nextHolder = ballHolder(next);

  for (const piece of content.pieces) {
    const from = step.at[piece.id];
    const to = next.at[piece.id];
    if (!from || !to || distance(from, to) < MIN_MOVE) continue;
    const keepsBall = holder === piece.id && nextHolder === piece.id;
    // Chi palleggia e poi tira: fino al punto del tiro e' un palleggio.
    const dribblesToShot = holder === piece.id && next.ball !== undefined && "shot" in next.ball;
    arrows.push({
      kind: keepsBall || dribblesToShot ? "dribble" : "move",
      from,
      to,
      pieceId: piece.id,
      ...(next.curves?.[piece.id] ? { via: next.curves[piece.id] } : {}),
    });
  }

  const ballFrom = launchPoint(step, next);
  const ballTo = ballPoint(next);
  if (
    ballFrom &&
    ballTo &&
    !(holder && holder === nextHolder) &&
    distance(ballFrom, ballTo) >= MIN_MOVE
  ) {
    const isShot = next.ball !== undefined && "shot" in next.ball;
    arrows.push({
      kind: isShot ? "shot" : "pass",
      from: ballFrom,
      to: ballTo,
      pieceId: holder ?? undefined,
      ...(next.ballCurve ? { via: next.ballCurve } : {}),
    });
  }
  return arrows;
}

/**
 * Da dove parte la palla quando cambia mano. Un tiro parte da dove il tiratore
 * arriva (prima palleggia, poi tira); un passaggio da dove il passatore era.
 */
export function launchPoint(step: DrillStep, next: DrillStep): Point | null {
  const holder = ballHolder(step);
  if (holder && next.ball && "shot" in next.ball) return next.at[holder] ?? step.at[holder] ?? null;
  return ballPoint(step);
}
