import type { Point } from "./court";

/**
 * Percorsi ad arco della lavagna (UX-73). Fra due passi un pezzo (o la palla)
 * va dritto, oppure passa da un punto scelto dallo staff: il **punto di
 * passaggio** (`via`), dove la curva si trova a meta' strada. Si salva quello
 * e non il punto di controllo della curva perche' e' quello che si trascina:
 * la maniglia sta sulla freccia, non in un punto vuoto del campo.
 *
 * La curva e' una Bezier quadratica: con partenza A, arrivo B e punto di
 * passaggio M, il controllo e' C = 2M - (A + B) / 2.
 */

export function controlFromVia(from: Point, via: Point, to: Point): Point {
  return { x: 2 * via.x - (from.x + to.x) / 2, y: 2 * via.y - (from.y + to.y) / 2 };
}

/** Il punto a meta' strada di un percorso dritto: dove sta la maniglia senza curva. */
export function midpoint(from: Point, to: Point): Point {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

/** Dove sta chi va da `from` a `to` (passando da `via`, se c'e') al tempo `t` (0-1). */
export function pathPoint(from: Point, to: Point, via: Point | undefined, t: number): Point {
  if (!via) return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  const c = controlFromVia(from, via, to);
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * c.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * c.y + t * t * to.y,
  };
}

/** Il percorso come spezzata di `n` tratti (per disegnarlo). */
export function samplePath(from: Point, to: Point, via: Point | undefined, n = 24): Point[] {
  if (!via) return [from, to];
  return Array.from({ length: n + 1 }, (_, i) => pathPoint(from, to, via, i / n));
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += dist(points[i - 1], points[i]);
  return len;
}

/**
 * Accorcia una spezzata di `start` metri all'inizio e `end` alla fine, lungo
 * il percorso: le frecce non coprono le pedine. Troppo corta: `null`.
 */
export function trimPath(points: Point[], start: number, end: number): Point[] | null {
  const total = pathLength(points);
  if (total <= start + end) return null;
  const at = (s: number): { i: number; p: Point } => {
    let acc = 0;
    for (let i = 1; i < points.length; i++) {
      const seg = dist(points[i - 1], points[i]);
      if (acc + seg >= s) {
        const k = seg === 0 ? 0 : (s - acc) / seg;
        const a = points[i - 1];
        const b = points[i];
        return { i, p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k } };
      }
      acc += seg;
    }
    return { i: points.length - 1, p: points[points.length - 1] };
  };
  const a = at(start);
  const b = at(total - end);
  return [a.p, ...points.slice(a.i, b.i), b.p];
}

/** Il percorso e' davvero curvo? Sotto i 10 cm dalla retta e' dritto. */
export function isCurved(from: Point, to: Point, via: Point | undefined): boolean {
  if (!via) return false;
  return dist(via, midpoint(from, to)) >= 0.1;
}
