/**
 * Campo da Baskin in metri, unica fonte per lo schema di `/il-baskin` (UX-41) e
 * per la lavagna (UX-72). Fonte: Regolamento di gioco EISI, Rev. 20, "Campo di
 * gioco (adattato)": campo da basket 28 x 15 m con due canestri laterali a meta'
 * campo, sul perimetro, e davanti a ognuno la zona dei pivot (semicerchio di 3 m).
 *
 * Sistema di riferimento: origine nell'angolo in alto a sinistra, `x` lungo il
 * lato lungo (0-28), `y` lungo il lato corto (0-15). I canestri grandi stanno a
 * sinistra e a destra, quelli laterali in alto e in basso.
 */

export const COURT_LENGTH = 28;
export const COURT_WIDTH = 15;

/** Misure delle linee, in metri (regolamento del basket, adattato EISI). */
export const COURT_LINES = {
  centerCircleR: 1.8,
  /** Area dei canestri grandi: profondita' dalla linea di fondo e larghezza. */
  key: { depth: 5.8, width: 4.9 },
  /** Centro del canestro grande dalla linea di fondo. */
  hoopFromBaseline: 1.575,
  /** Linea da tre: raggio dal canestro, distanza dei tratti dritti dal lato lungo. */
  three: { r: 6.75, fromSideline: 0.9 },
  /** Zona dei pivot davanti ai canestri laterali. */
  pivotZoneR: 3,
  /** Raggio del ferro (45 cm di diametro). */
  hoopR: 0.225,
} as const;

export interface Point {
  x: number;
  y: number;
}

export const COURT_CENTER: Point = { x: COURT_LENGTH / 2, y: COURT_WIDTH / 2 };

/**
 * Lunghezza dei tratti dritti della linea da tre, dalla linea di fondo: dove
 * l'arco attorno al canestro incontra la retta a `fromSideline` dal lato lungo.
 */
export function threePointStraight(lines: { hoopFromBaseline: number; threeR: number }): number {
  const dy = COURT_WIDTH / 2 - COURT_LINES.three.fromSideline;
  return lines.hoopFromBaseline + Math.sqrt(lines.threeR ** 2 - dy ** 2);
}

/** Spessore di una linea: il perimetro e i ferri piu' marcati, il resto sottile. */
export type CourtStroke = "thick" | "thin";

export type CourtShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; stroke: CourtStroke }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; stroke: CourtStroke }
  | { kind: "circle"; cx: number; cy: number; r: number; stroke: CourtStroke }
  | { kind: "path"; d: string; stroke: CourtStroke; filled?: boolean };

export interface CourtShapeOptions {
  /**
   * Raggio disegnato della zona dei pivot. Lo schema di `/il-baskin` la fa piu'
   * grande del vero perche' dentro ci devono stare i numeri dei ruoli; la
   * lavagna usa la misura vera.
   */
  pivotZoneR?: number;
  /** Raggio disegnato dei ferri: nello schema piccolo quello vero non si vede. */
  hoopR?: number;
  /** Centro dei ferri laterali dal lato lungo (sul perimetro, appena dentro). */
  sideHoopInset?: number;
}

/**
 * Le linee del campo intero, in metri, nell'ordine in cui si disegnano: prima
 * le zone dei pivot (riempite), poi perimetro, meta' campo, cerchio, aree e
 * linee da tre, per ultimi i canestri. La linea di meta' campo si ferma sulle
 * zone dei pivot, che la coprirebbero.
 */
export function courtShapes(options: CourtShapeOptions = {}): CourtShape[] {
  const zoneR = options.pivotZoneR ?? COURT_LINES.pivotZoneR;
  const hoopR = options.hoopR ?? COURT_LINES.hoopR;
  const sideInset = options.sideHoopInset ?? hoopR;
  const { x: midX, y: midY } = COURT_CENTER;
  const L = COURT_LENGTH;
  const W = COURT_WIDTH;
  const { key, hoopFromBaseline, three, centerCircleR } = COURT_LINES;
  const straight = threePointStraight({ hoopFromBaseline, threeR: three.r });
  const top = three.fromSideline;
  const bottom = W - three.fromSideline;

  return [
    // Zone dei pivot: semicerchi a meta' campo, sui due lati lunghi.
    {
      kind: "path",
      d: `M${midX - zoneR},0 A${zoneR},${zoneR} 0 0 0 ${midX + zoneR},0`,
      stroke: "thin",
      filled: true,
    },
    {
      kind: "path",
      d: `M${midX - zoneR},${W} A${zoneR},${zoneR} 0 0 1 ${midX + zoneR},${W}`,
      stroke: "thin",
      filled: true,
    },

    // Campo: perimetro, meta' campo, cerchio centrale.
    { kind: "rect", x: 0, y: 0, w: L, h: W, stroke: "thick" },
    { kind: "line", x1: midX, y1: zoneR, x2: midX, y2: W - zoneR, stroke: "thin" },
    { kind: "circle", cx: midX, cy: midY, r: centerCircleR, stroke: "thin" },

    // Aree e linee da tre dei canestri grandi.
    { kind: "rect", x: 0, y: midY - key.width / 2, w: key.depth, h: key.width, stroke: "thin" },
    {
      kind: "rect",
      x: L - key.depth,
      y: midY - key.width / 2,
      w: key.depth,
      h: key.width,
      stroke: "thin",
    },
    {
      kind: "path",
      d: `M0,${top} h${straight} A${three.r},${three.r} 0 0 1 ${straight},${bottom} h${-straight}`,
      stroke: "thin",
    },
    {
      kind: "path",
      d: `M${L},${top} h${-straight} A${three.r},${three.r} 0 0 0 ${L - straight},${bottom} h${straight}`,
      stroke: "thin",
    },

    // Canestri: i due grandi e i due laterali.
    { kind: "circle", cx: hoopFromBaseline, cy: midY, r: hoopR, stroke: "thick" },
    { kind: "circle", cx: L - hoopFromBaseline, cy: midY, r: hoopR, stroke: "thick" },
    { kind: "circle", cx: midX, cy: sideInset, r: hoopR, stroke: "thick" },
    { kind: "circle", cx: midX, cy: W - sideInset, r: hoopR, stroke: "thick" },
  ];
}
