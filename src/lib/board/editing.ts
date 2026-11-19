import { COURT_LENGTH, COURT_WIDTH, type Point } from "./court";
import {
  HALF_COURT_MIN_X,
  MAX_PIECES,
  MAX_STEPS,
  isPlayerPiece,
  type DrillBall,
  type DrillContent,
  type DrillPiece,
  type DrillStep,
} from "./content";

/**
 * Modifiche al disegno di uno schema (UX-72), come funzioni pure: l'editor del
 * pannello le compone e ne tiene la storia per Annulla e Ripeti. Ognuna
 * restituisce un contenuto nuovo e lascia valido quello che lo schema Zod
 * controlla (ogni pezzo in ogni passo, palla in mano a chi e' in campo).
 */

type Court = "FULL" | "HALF";

/** Distanza entro cui la palla lasciata vicino a un giocatore gli finisce in mano. */
export const BALL_SNAP = 1;

const round = (n: number) => Math.round(n * 100) / 100;

/** Porta un punto dentro il campo (o dentro la meta' di destra). */
export function clampToCourt(p: Point, court: Court): Point {
  const minX = court === "HALF" ? HALF_COURT_MIN_X : 0;
  return {
    x: round(Math.min(COURT_LENGTH, Math.max(minX, p.x))),
    y: round(Math.min(COURT_WIDTH, Math.max(0, p.y))),
  };
}

/** Centro della parte di campo che si vede. */
export function courtCenter(court: Court): Point {
  return court === "HALF"
    ? { x: (HALF_COURT_MIN_X + COURT_LENGTH) / 2, y: COURT_WIDTH / 2 }
    : { x: COURT_LENGTH / 2, y: COURT_WIDTH / 2 };
}

/** Primo codice libero: p1, p2, ... */
export function nextPieceId(content: DrillContent): string {
  const used = new Set(content.pieces.map((p) => p.id));
  for (let n = 1; ; n++) if (!used.has(`p${n}`)) return `p${n}`;
}

/**
 * Un posto libero vicino al centro, per un pezzo appena aggiunto: a spirale,
 * a passi di 1,5 m, finche' non trova un punto lontano dagli altri pezzi.
 */
export function freeSpot(content: DrillContent, stepIndex: number, court: Court): Point {
  const center = courtCenter(court);
  const taken = Object.values(content.steps[stepIndex]?.at ?? {}).filter((p): p is Point => !!p);
  for (let ring = 0; ring < 6; ring++) {
    const count = ring === 0 ? 1 : ring * 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      const p = clampToCourt(
        { x: center.x + Math.cos(angle) * ring * 1.5, y: center.y + Math.sin(angle) * ring * 1.5 },
        court
      );
      if (taken.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= 1.2)) return p;
    }
  }
  return center;
}

const mapSteps = (content: DrillContent, fn: (step: DrillStep, i: number) => DrillStep) => ({
  ...content,
  steps: content.steps.map(fn),
});

/** Aggiunge un pezzo: c'e' dal passo `stepIndex` in poi, prima e' fuori dal campo. */
export function addPiece(
  content: DrillContent,
  stepIndex: number,
  piece: Omit<DrillPiece, "id">,
  at: Point
): { content: DrillContent; id: string } {
  if (content.pieces.length >= MAX_PIECES) return { content, id: "" };
  const id = nextPieceId(content);
  return {
    id,
    content: {
      ...mapSteps(content, (step, i) => ({
        ...step,
        at: { ...step.at, [id]: i < stepIndex ? null : at },
      })),
      pieces: [...content.pieces, { ...piece, id }],
    },
  };
}

/** Cambia ruolo, lato, scritta o tipo di allenatore di un pezzo. */
export function updatePiece(
  content: DrillContent,
  id: string,
  patch: Partial<Omit<DrillPiece, "id" | "kind">>
): DrillContent {
  return { ...content, pieces: content.pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
}

/** Toglie un pezzo da tutti i passi, con la palla e i blocchi che lo riguardano. */
export function removePiece(content: DrillContent, id: string): DrillContent {
  return {
    ...mapSteps(content, (step) => dropPieceRefs(step, id, true)),
    pieces: content.pieces.filter((p) => p.id !== id),
  };
}

function dropPieceRefs(step: DrillStep, id: string, removeKey: boolean): DrillStep {
  const at = { ...step.at };
  if (removeKey) delete at[id];
  else at[id] = null;
  const ball =
    step.ball && "holder" in step.ball && step.ball.holder === id ? undefined : step.ball;
  const screens = step.screens?.filter((s) => s.from !== id);
  return withCurve({ ...step, at, ball, screens: screens?.length ? screens : undefined }, id);
}

/** Il passo con il percorso di `id` messo (o tolto, senza `via`); vuoto = niente campo. */
function withCurve(step: DrillStep, id: string, via?: Point): DrillStep {
  const curves = { ...step.curves };
  if (via) curves[id] = via;
  else delete curves[id];
  const next: DrillStep = { ...step, curves };
  if (!Object.keys(curves).length) delete next.curves;
  return next;
}

/** Il passo senza percorsi ad arco: la strada per arrivarci e' cambiata. */
function straight(step: DrillStep): DrillStep {
  const next = { ...step };
  delete next.curves;
  delete next.ballCurve;
  return next;
}

/**
 * Curva (o raddrizza, con `undefined`) il percorso con cui un pezzo arriva al
 * passo `stepIndex` dal precedente (UX-73). `via` e' il punto da cui passa a
 * meta' strada, dentro il campo. Il primo passo non ha un percorso.
 */
export function setCurve(
  content: DrillContent,
  stepIndex: number,
  id: string,
  via: Point | undefined,
  court: Court
): DrillContent {
  if (stepIndex <= 0) return content;
  const p = via ? clampToCourt(via, court) : undefined;
  return mapSteps(content, (step, i) => (i === stepIndex ? withCurve(step, id, p) : step));
}

/** Lo stesso per la palla che arriva al passo `stepIndex` (passaggio o tiro). */
export function setBallCurve(
  content: DrillContent,
  stepIndex: number,
  via: Point | undefined,
  court: Court
): DrillContent {
  if (stepIndex <= 0) return content;
  return mapSteps(content, (step, i) => {
    if (i !== stepIndex) return step;
    const next = { ...step };
    if (via) next.ballCurve = clampToCourt(via, court);
    else delete next.ballCurve;
    return next;
  });
}

/** Il pezzo esce dal campo da questo passo in avanti (sostituzioni, file). */
export function leaveFromStep(content: DrillContent, stepIndex: number, id: string): DrillContent {
  return mapSteps(content, (step, i) => (i < stepIndex ? step : dropPieceRefs(step, id, false)));
}

/**
 * Sposta un pezzo nel passo aperto. Se in quel passo non era in campo, ci
 * entra. Chi ha la palla se la porta dietro (sta nella sua mano).
 */
export function movePiece(
  content: DrillContent,
  stepIndex: number,
  id: string,
  to: Point,
  court: Court
): DrillContent {
  const p = clampToCourt(to, court);
  return mapSteps(content, (step, i) =>
    i === stepIndex ? { ...step, at: { ...step.at, [id]: p } } : step
  );
}

/** Imposta (o toglie, con `undefined`) la palla del passo aperto. */
export function setBall(
  content: DrillContent,
  stepIndex: number,
  ball: DrillBall | undefined
): DrillContent {
  return mapSteps(content, (step, i) => (i === stepIndex ? { ...step, ball } : step));
}

/**
 * Lascia la palla in un punto: se c'e' un giocatore entro `BALL_SNAP` metri
 * finisce in mano al piu' vicino, altrimenti resta per terra.
 */
export function dropBall(
  content: DrillContent,
  stepIndex: number,
  to: Point,
  court: Court
): DrillContent {
  const step = content.steps[stepIndex];
  if (!step) return content;
  let best: { id: string; d: number } | null = null;
  for (const piece of content.pieces) {
    const p = step.at[piece.id];
    if (!p || !isPlayerPiece(piece)) continue;
    const d = Math.hypot(p.x - to.x, p.y - to.y);
    if (d <= BALL_SNAP && (!best || d < best.d)) best = { id: piece.id, d };
  }
  return setBall(content, stepIndex, best ? { holder: best.id } : clampToCourt(to, court));
}

export function setStepText(content: DrillContent, stepIndex: number, text: string): DrillContent {
  return mapSteps(content, (step, i) =>
    i === stepIndex ? { ...step, text: text.trim() ? text : undefined } : step
  );
}

/** Aggiunge o sostituisce il blocco di un giocatore nel passo aperto. */
export function setScreen(
  content: DrillContent,
  stepIndex: number,
  from: string,
  to: Point,
  court: Court
): DrillContent {
  return mapSteps(content, (step, i) =>
    i === stepIndex
      ? {
          ...step,
          screens: [
            ...(step.screens ?? []).filter((s) => s.from !== from),
            { from, to: clampToCourt(to, court) },
          ],
        }
      : step
  );
}

export function removeScreen(content: DrillContent, stepIndex: number, from: string): DrillContent {
  return mapSteps(content, (step, i) => {
    if (i !== stepIndex) return step;
    const screens = step.screens?.filter((s) => s.from !== from);
    return { ...step, screens: screens?.length ? screens : undefined };
  });
}

/**
 * Nuovo passo dopo `afterIndex`: si parte da dove si era rimasti (stesse
 * posizioni, palla nella stessa mano), senza testo ne' blocchi. Dopo un tiro
 * la palla non c'e': la rimette lo staff.
 */
export function addStep(content: DrillContent, afterIndex: number): DrillContent {
  if (content.steps.length >= MAX_STEPS) return content;
  const from = content.steps[afterIndex];
  if (!from) return content;
  const ball = from.ball && !("shot" in from.ball) ? from.ball : undefined;
  const copy: DrillStep = { at: { ...from.at }, ...(ball ? { ball } : {}) };
  const steps = [...content.steps];
  steps.splice(afterIndex + 1, 0, copy);
  return { ...content, steps };
}

export function removeStep(content: DrillContent, index: number): DrillContent {
  if (content.steps.length <= 1) return content;
  const steps = content.steps.filter((_, i) => i !== index);
  // Il passo che prende il posto di quello tolto ci arriva da un altro passo:
  // i suoi archi non valgono piu' (e il primo passo non ne ha).
  for (const i of [0, index]) if (steps[i]) steps[i] = straight(steps[i]);
  // Il primo passo non puo' essere un tiro.
  if (steps[0]?.ball && "shot" in steps[0].ball) steps[0] = { ...steps[0], ball: undefined };
  return { ...content, steps };
}

/** Sposta un passo prima (-1) o dopo (+1). */
export function moveStep(content: DrillContent, index: number, delta: -1 | 1): DrillContent {
  const target = index + delta;
  if (target < 0 || target >= content.steps.length) return content;
  const steps = [...content.steps];
  [steps[index], steps[target]] = [steps[target], steps[index]];
  if (steps[0]?.ball && "shot" in steps[0].ball) return content;
  // Cambiano le strade per arrivare ai due passi e a quello dopo: niente archi.
  const after = Math.max(index, target) + 1;
  for (const i of [index, target, after]) if (steps[i]) steps[i] = straight(steps[i]);
  return { ...content, steps };
}

/** Porta dentro la meta' di destra tutto quello che sta a sinistra (passando a meta' campo). */
export function clampContentToHalf(content: DrillContent): DrillContent {
  return mapSteps(content, (step) => ({
    ...step,
    at: Object.fromEntries(
      Object.entries(step.at).map(([id, p]) => [id, p ? clampToCourt(p, "HALF") : null])
    ),
    ball:
      step.ball && "x" in step.ball
        ? clampToCourt(step.ball, "HALF")
        : step.ball && "shot" in step.ball && !["rightMain", "bottomSide"].includes(step.ball.shot)
          ? { shot: "rightMain" }
          : step.ball,
    screens: step.screens?.map((s) => ({ ...s, to: clampToCourt(s.to, "HALF") })),
    ...(step.curves
      ? {
          curves: Object.fromEntries(
            Object.entries(step.curves).map(([id, p]) => [id, clampToCourt(p, "HALF")])
          ),
        }
      : {}),
    ...(step.ballCurve ? { ballCurve: clampToCourt(step.ballCurve, "HALF") } : {}),
  }));
}
