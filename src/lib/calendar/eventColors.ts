import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { teamColor } from "@/lib/teamColors";
import type { CalendarEventType } from "@/app/api/calendar/route";

/**
 * Fonte unica della resa degli impegni del calendario: chip della griglia,
 * barre mobile, righe della vista giorno, banner del dettaglio e legenda
 * passano tutti di qui.
 *
 * UX-29: il TIPO non ha una tinta, lo dicono forma e icona (partita = pieno nel
 * nero del marchio, allenamento = contornato, evento = tenue). La SQUADRA e' la
 * fascia sul bordo sinistro, nella sua tinta; senza tinta nessuna fascia. Niente
 * arancio sui chip: nella griglia si tocca tutto, colorarli annullerebbe il
 * segnale. L'arancio resta su "Nuovo", sul giorno corrente e su "Mostra tutto".
 */
export type EventShape = "filled" | "outlined" | "tonal";

export interface EventVisual {
  /** Forma del chip, che insieme all'icona dice il tipo. */
  shape: EventShape;
  /** Sfondo del chip. */
  bg: string;
  /** Testo e icone sopra `bg` (>= 4,5:1). */
  fg: string;
  /** Bordo di 1px (solo `outlined`), altrimenti null. */
  border: string | null;
  /** Sfondo in hover. */
  hover: string;
  /** Tinta della squadra per la fascia sinistra; null = nessuna fascia. */
  accent: string | null;
}

/** Forma del chip per ogni tipo di impegno. */
export const EVENT_SHAPE: Record<CalendarEventType, EventShape> = {
  match: "filled",
  training: "outlined",
  event: "tonal",
};

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
  const { palette } = theme;
  const accent = teamColor(rawTeamColor);
  switch (EVENT_SHAPE[type]) {
    case "filled":
      return {
        shape: "filled",
        bg: palette.secondary.main,
        fg: palette.secondary.contrastText,
        border: null,
        hover: alpha(palette.secondary.main, 0.85),
        accent,
      };
    case "outlined":
      return {
        shape: "outlined",
        bg: palette.background.paper,
        fg: palette.text.primary,
        border: palette.text.secondary,
        hover: palette.action.hover,
        accent,
      };
    case "tonal":
      return {
        shape: "tonal",
        bg: palette.action.selected,
        fg: palette.text.primary,
        border: null,
        hover: alpha(
          palette.text.primary,
          palette.action.selectedOpacity + palette.action.hoverOpacity
        ),
        accent,
      };
  }
}

/** Sfondo, testo e bordo di un chip, da stendere in un `sx`. */
export function surfaceSx(visual: EventVisual) {
  return {
    bgcolor: visual.bg,
    color: visual.fg,
    border: visual.border ? `1px solid ${visual.border}` : "1px solid transparent",
  };
}

/**
 * Fascia squadra sul bordo sinistro, con un separatore di 1px del colore del
 * foglio fra la fascia e il corpo del chip: cosi' la tinta si confronta con il
 * foglio (>= 3:1 per tutte le tinte, nei due temi) e non con il fondo del chip,
 * che per le partite e' il nero del marchio.
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
 * sovrascriverebbe l'altra. Sul chip contornato la fascia prende il posto del
 * bordo sinistro: stendere questo `sx` dopo `surfaceSx`.
 *
 * L'eco marca gli impegni della squadra di chi guarda: un secondo contorno nella
 * tinta della squadra, staccato da un filo del colore del foglio. Il
 * `box-shadow` non occupa spazio nel flusso, quindi non sposta la griglia.
 */
export function decorationSx(theme: Theme, opts: DecorationOptions) {
  const { accent, bandWidth = 5, echo, echoGap = 1.5, echoWidth = 1.5 } = opts;
  const paper = theme.palette.background.paper;
  const shadows: string[] = [];

  if (accent) shadows.push(`inset 1px 0 0 ${paper}`);
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
