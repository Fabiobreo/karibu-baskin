import type { Theme } from "@mui/material/styles";
import { TEAM_META, bibFill } from "@/lib/constants";
import type { BibKey } from "@/lib/trainingTeams";

/**
 * Le casacche d'allenamento sullo schermo (eccezione chiusa di UX-29: colori
 * veri delle maglie, sempre col nome).
 *
 * La casacca nera (`#1A1A1A`) sul tema scuro (`#1E1E1E`) sta a 1,04:1: chip,
 * pallini e banner "la tua squadra" sparivano, e il timbro dei Neri (inchiostro
 * nero su fondo trasparente) non si vedeva (suggerimento del 17/10/2026). Lì
 * prende un contorno col colore dei bordi dei campi (`border.control`, già
 * tenuto a 3:1 sul fondo scuro da `palette.test.ts`) e il timbro un
 * inchiostro chiaro. Nessuna tinta nuova.
 */

/** Dove la casacca sparirebbe nel fondo e ha bisogno del contorno. */
export function bibNeedsRing(key: BibKey, mode: Theme["palette"]["mode"]): boolean {
  return key === "teamB" && mode === "dark";
}

export function bibMeta(key: BibKey) {
  return TEAM_META.find((t) => t.key === key) ?? TEAM_META[0];
}

/** Contorno interno: niente spostamenti di layout, vale anche su un Chip. */
function ring(theme: Theme) {
  return { outline: `1px solid ${theme.palette.border.control}`, outlineOffset: "-1px" };
}

/** Superficie della casacca sotto un'etichetta bianca (chip, banner, fascia). */
export function bibSurfaceSx(key: BibKey) {
  return (theme: Theme) => ({
    bgcolor: bibFill(bibMeta(key).color),
    color: theme.palette.common.white,
    ...(bibNeedsRing(key, theme.palette.mode) && ring(theme)),
  });
}

/** Pallino della casacca, nel colore vero della maglia. */
export function bibDotSx(key: BibKey) {
  return (theme: Theme) => ({
    bgcolor: bibMeta(key).color,
    ...(bibNeedsRing(key, theme.palette.mode) && ring(theme)),
  });
}

/** Il timbro della squadra (`/stamps/*.png`, inchiostro su fondo trasparente). */
export function bibStampSx(key: BibKey) {
  return (theme: Theme) => ({
    opacity: 0.5,
    // Inchiostro nero → chiaro: invertire lascia intatto il disegno.
    ...(bibNeedsRing(key, theme.palette.mode) && { filter: "invert(1)", opacity: 0.6 }),
  });
}
