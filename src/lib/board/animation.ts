import type { Point } from "./court";
import { ballHolder, ballPoint, launchPoint } from "./arrows";
import type { DrillContent } from "./content";
import { pathPoint } from "./curves";

/**
 * Dove stanno i pezzi a un certo punto del passaggio da un passo al successivo
 * (UX-72). `t` va da 0 (passo `index`) a 1 (passo successivo).
 *
 * - Un pezzo in campo nei due passi scorre, con partenza e arrivo morbidi,
 *   dritto o lungo l'arco scelto dallo staff (`DrillStep.curves`, UX-73).
 * - Un pezzo che entra compare sul posto, uno che esce sparisce sul posto.
 * - La palla segue chi la tiene. Quando cambia mano, resta al passatore fino a
 *   meta' e nella seconda meta' vola verso chi la riceve (o verso il canestro):
 *   cosi' chi palleggia e poi tira prima arriva, poi tira.
 */

export interface PieceFrame {
  x: number;
  y: number;
  /** 1 in campo, fra 0 e 1 mentre entra o esce. */
  opacity: number;
}

/**
 * La palla: dove sta e quanto e' "in mano" (1 in mano a qualcuno, 0 per terra
 * o nel ferro, in mezzo mentre vola). Chi disegna la sposta in alto a destra
 * della pedina in proporzione, perche' la misura della pedina dipende dallo
 * schermo e un numero fisso in metri finirebbe sopra il numero del ruolo.
 */
export interface BallFrame extends Point {
  hand: number;
}

export interface BoardFrame {
  pieces: Record<string, PieceFrame>;
  ball: BallFrame | null;
}

export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 2 * c * c : 1 - (-2 * c + 2) ** 2 / 2;
}

const inHand = (p: Point): BallFrame => ({ x: p.x, y: p.y, hand: 1 });
const loose = (p: Point | null): BallFrame | null => (p ? { x: p.x, y: p.y, hand: 0 } : null);

/** Fotografia del passo `index` (con `t` = 0) o del passaggio al successivo. */
export function interpolateStep(content: DrillContent, index: number, t = 0): BoardFrame {
  const step = content.steps[index];
  if (!step) return { pieces: {}, ball: null };
  const next = content.steps[index + 1];
  const progress = next ? Math.min(1, Math.max(0, t)) : 0;
  const eased = easeInOut(progress);

  const pieces: Record<string, PieceFrame> = {};
  for (const piece of content.pieces) {
    const from = step.at[piece.id];
    const to = next?.at[piece.id] ?? null;
    if (from && (to || !next)) {
      const p = to ? pathPoint(from, to, next?.curves?.[piece.id], eased) : from;
      pieces[piece.id] = { ...p, opacity: 1 };
    } else if (from) {
      pieces[piece.id] = { ...from, opacity: 1 - progress };
    } else if (to && progress > 0) {
      pieces[piece.id] = { ...to, opacity: progress };
    }
  }

  return { pieces, ball: ballAt(content, index, progress, pieces) };
}

function ballAt(
  content: DrillContent,
  index: number,
  progress: number,
  pieces: Record<string, PieceFrame>
): BallFrame | null {
  const step = content.steps[index];
  const next = content.steps[index + 1];
  const holder = ballHolder(step);
  const here = loose(ballPoint(step));
  const handOf = (id: string): BallFrame | null => (pieces[id] ? inHand(pieces[id]) : null);

  if (!next || progress === 0) return holder ? handOf(holder) : here;
  const nextHolder = ballHolder(next);
  if (holder && holder === nextHolder) return handOf(holder);
  // Nel passo dopo la palla non c'e' piu': resta dov'era fino al cambio.
  if (!next.ball) return holder ? handOf(holder) : here;

  // La palla cambia mano: prima resta al passatore, poi vola.
  if (holder && progress < 0.5) return handOf(holder);
  const startT = holder ? 0.5 : 0;
  const flight = easeInOut((progress - startT) / (1 - startT));
  const launch = holder ? handOf(holder) : loose(launchPoint(step, next));
  const target = nextHolder ? handOf(nextHolder) : loose(ballPoint(next));
  if (!launch || !target) return target ?? launch;
  return {
    ...pathPoint(launch, target, next.ballCurve, flight),
    hand: launch.hand + (target.hand - launch.hand) * flight,
  };
}
