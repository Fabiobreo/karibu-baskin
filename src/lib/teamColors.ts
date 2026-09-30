import { TEAM, TEAM_LABEL, TEAM_RING } from "@/lib/palette";

/**
 * Colore delle squadre (UX-29): l'unico punto da cui si legge.
 *
 * Nel database (`CompetitiveTeam.color`) si salva la chiave della tinta
 * (`"blue"`). Le squadre create prima di UX-29 hanno un hex libero: si porta
 * sulla tinta della palette **in lettura**, per settore di tinta, senza toccare
 * i dati. Senza colore non si disegna nessun segno: mai l'arancio (che vuol dire
 * "si tocca") come ripiego.
 */

/** Tinte in ordine di proposta per una squadra nuova. Ardesia e' della Karibu. */
export const TEAM_TINTS = [
  "violet",
  "green",
  "blue",
  "orange",
  "gold",
  "raspberry",
  "slate",
] as const;
export type TeamTint = (typeof TEAM_TINTS)[number];

/** Nomi per il selettore dello staff (l'admin e' solo in italiano). */
export const TEAM_TINT_LABELS: Record<TeamTint, string> = {
  violet: "Viola",
  green: "Verde",
  blue: "Blu",
  orange: "Arancio",
  gold: "Oro",
  raspberry: "Lampone",
  slate: "Ardesia",
};

/** Tinta della squadra Karibu di stagione. */
export const CLUB_TEAM_TINT: TeamTint = "slate";

/** Tinte proposte alle squadre normali: tutte tranne quella della Karibu. */
const ASSIGNABLE: readonly TeamTint[] = TEAM_TINTS.filter((t) => t !== CLUB_TEAM_TINT);

export function isTeamTint(value: unknown): value is TeamTint {
  return typeof value === "string" && (TEAM_TINTS as readonly string[]).includes(value);
}

function parseHex(raw: string): [number, number, number] | null {
  const m = raw.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Croma e tinta OKLCH (Ottosson 2020) di un colore sRGB. */
function oklchOf([r, g, b]: [number, number, number]): { C: number; h: number } {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(a * a + bb * bb);
  const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { C, h };
}

/**
 * Tinta della palette per un valore salvato: chiave, hex della palette o hex
 * storico. `null` se non c'e' colore o non si legge (niente segno di colore).
 *
 * Per gli hex storici si usano settori di tinta OKLCH con confini dichiarati,
 * uno per famiglia di maglia. Ogni tinta della palette ricade nel proprio
 * settore: la funzione e' idempotente.
 */
export function teamTint(raw: string | null | undefined): TeamTint | null {
  if (!raw) return null;
  if (isTeamTint(raw)) return raw;
  const rgb = parseHex(raw);
  if (!rgb) return null;
  const hex =
    "#" +
    rgb
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  const exact = TEAM_TINTS.find((t) => TEAM[t] === hex);
  if (exact) return exact;
  const { C, h } = oklchOf(rgb);
  if (C < 0.035) return "slate"; // neri, grigi, bianchi
  if (h >= 345 || h < 35) return "raspberry"; // rossi, rosa, magenta
  if (h < 72) return "orange"; // arancio, marrone
  if (h < 120) return "gold"; // oro, giallo, oliva
  if (h < 200) return "green"; // verdi, verde acqua
  if (h < 285) return "blue"; // azzurri, blu
  return "violet";
}

/**
 * Hex della tinta di una squadra, uguale nei due temi, o `null` se la squadra
 * non ha colore. Vale ovunque: `sx`, hero, OG, tabellino, html2canvas.
 */
export function teamColor(raw: string | null | undefined): string | null {
  const tint = teamTint(raw);
  return tint ? TEAM[tint] : null;
}

/**
 * Riempimento di una squadra (chip, intestazione di card, avatar): fondo,
 * etichetta leggibile sopra (bianca o scura secondo la tinta) e, per l'Oro,
 * l'anello da mettere sulle superfici chiare. `null` senza colore: in quel caso
 * il chip e' contornato neutro, mai arancio.
 */
export function teamFill(
  raw: string | null | undefined
): { bg: string; fg: string; ring: string | null } | null {
  const tint = teamTint(raw);
  if (!tint) return null;
  return { bg: TEAM[tint], fg: TEAM_LABEL[tint], ring: tint === "gold" ? TEAM_RING : null };
}

/**
 * Tinta da proporre a una squadra nuova: quella della squadra con lo stesso
 * nome nella stagione precedente, se c'e' e non e' gia' presa; altrimenti la
 * prima tinta non usata nella stagione (Ardesia esclusa, e' della Karibu).
 */
export function suggestTeamTint(
  name: string,
  previousSeason: { name: string; color: string | null }[],
  sameSeasonColors: (string | null)[]
): TeamTint {
  const used = new Set(sameSeasonColors.map(teamTint).filter((t): t is TeamTint => t !== null));
  const key = name.trim().toLocaleLowerCase("it");
  const namesake = previousSeason.find((t) => t.name.trim().toLocaleLowerCase("it") === key);
  const inherited = teamTint(namesake?.color);
  if (inherited && inherited !== CLUB_TEAM_TINT && !used.has(inherited)) return inherited;
  return ASSIGNABLE.find((t) => !used.has(t)) ?? ASSIGNABLE[0];
}
