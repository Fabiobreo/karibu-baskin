import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { contrastText } from "@/lib/colorUtils";
import { teamColor, teamFill } from "@/lib/teamColors";
import type { CalendarEventType } from "@/app/api/calendar/route";

/**
 * Fonte unica della resa degli impegni del calendario: chip della griglia,
 * barre mobile, righe della vista giorno, banner del dettaglio e legenda
 * passano tutti di qui.
 *
 * Il fondo del chip dice il TIPO (petrolio allenamento, arancio partita,
 * azzurro evento: `palette.calendar`), insieme all'icona. La SQUADRA e' la
 * fascia sul bordo sinistro, nella sua tinta; senza tinta nessuna fascia.
 * Si e' tornati ai colori (01/10) dopo la prova "solo forma" di UX-29: nella
 * griglia del mese le tre forme in bianco e nero si distinguevano peggio.
 */
export interface EventVisual {
  /** Sfondo pieno del chip: dipende solo dal tipo. */
  bg: string;
  /** Testo e icone sopra `bg`, scelti per contrasto (>= 4,5:1). */
  fg: string;
  /** Sfondo in hover. */
  hover: string;
  /** Tinta della squadra per la fascia sinistra; null = nessuna fascia. */
  accent: string | null;
}

/**
 * Resa completa di un impegno.
 * `rawTeamColor` e' il valore salvato per la squadra (chiave della tinta o hex
 * storico): passa da `teamColor()`, che da' null quando non c'e' tinta.
 */
export function eventVisual(
  theme: Theme,
  type: CalendarEventType,
  rawTeamColor?: string | null
): EventVisual {
  const bg = theme.palette.calendar[type];
  return {
    bg,
    fg: contrastText(bg),
    hover: alpha(bg, 0.85),
    accent: teamColor(rawTeamColor),
  };
}

/** Sfondo e testo di un chip, da stendere in un `sx`. */
export function surfaceSx(visual: EventVisual) {
  return { bgcolor: visual.bg, color: visual.fg };
}

/**
 * Fascia squadra sul bordo sinistro, con un separatore di 1px del colore del
 * foglio fra la fascia e il corpo del chip: cosi' la tinta si confronta con il
 * foglio (>= 3:1 per tutte le tinte, nei due temi) e non con il fondo del chip,
 * che e' una tinta satura.
 */
export interface DecorationOptions {
  /** Tinta squadra per la fascia sul bordo sinistro. */
  accent?: string | null;
  /** Larghezza della fascia. */
  bandWidth?: number;
  /**
   * Colore dell'eco esterna, quando l'elemento va marcato come "tuo": la tinta
   * della squadra, o `text.primary` se l'impegno non ha tinta.
   */
  echo?: string | null;
  echoGap?: number;
  echoWidth?: number;
}

/**
 * Decorazioni di un chip: fascia squadra a sinistra ed eventuale eco esterna.
 * Tornano insieme perche' condividono `box-shadow` e una sola delle due
 * sovrascriverebbe l'altra. Stendere questo `sx` dopo `surfaceSx`.
 *
 * L'eco marca gli impegni della squadra di chi guarda: un secondo contorno nella
 * tinta della squadra, staccato da un filo del colore del foglio. Il
 * `box-shadow` non occupa spazio nel flusso, quindi non sposta la griglia.
 */
export function decorationSx(theme: Theme, opts: DecorationOptions) {
  const { accent, bandWidth = 5, echo, echoGap = 1.5, echoWidth = 1.5 } = opts;
  const paper = theme.palette.background.paper;
  const shadows: string[] = [];

  if (accent) {
    shadows.push(`inset 1px 0 0 ${paper}`);
    // L'Oro sulle superfici chiare sta sotto il 3:1: un filo fuori dalla fascia.
    const ring = teamFill(accent)?.ring;
    if (ring && theme.palette.mode === "light") shadows.push(`-1px 0 0 0 ${ring}`);
  }
  if (echo) {
    shadows.push(`0 0 0 ${echoGap}px ${paper}`, `0 0 0 ${echoGap + echoWidth}px ${echo}`);
  }

  return {
    ...(accent ? { borderLeft: `${bandWidth}px solid ${accent}` } : {}),
    ...(shadows.length ? { boxShadow: shadows.join(", ") } : {}),
  };
}

/** Colore dell'eco "la tua squadra": la tinta, o l'inchiostro se non ce n'e'. */
export function echoColor(theme: Theme, visual: Pick<EventVisual, "accent">): string {
  return visual.accent ?? theme.palette.text.primary;
}

/**
 * Chiavi dei filtri della legenda. Le squadre si filtrano per ID e non per
 * colore: due squadre con la stessa tinta sono comunque due filtri distinti.
 */
export const typeFilterKey = (type: CalendarEventType) => `type:${type}`;
export const teamFilterKey = (teamId: string) => `team:${teamId}`;
