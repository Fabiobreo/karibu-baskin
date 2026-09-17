import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { contrastText } from "@/lib/colorUtils";
import type { CalendarEventType } from "@/app/api/calendar/route";

/**
 * Fonte unica dei colori del calendario: chip della griglia, barre mobile,
 * righe della vista giorno, banner del dettaglio e legenda passano tutti di
 * qui. Prima ogni superficie se li calcolava da sola (la legenda da un token
 * del tema, i chip da un hex dell'API) e il risultato era che la legenda
 * mostrava un colore e la griglia un altro.
 *
 * La regola e' ibrida: lo SFONDO dice il tipo di evento, il BORDO SINISTRO dice
 * la squadra. Cosi' il colore squadra resta leggibile a colpo d'occhio senza
 * rubare la codifica del tipo.
 */
export interface EventVisual {
  /** Sfondo pieno del chip: dipende solo dal tipo. */
  bg: string;
  /** Testo e icone sopra `bg`, scelti per contrasto (WCAG AA). */
  fg: string;
  /** Colore squadra per il bordo sinistro; null se l'evento non ha squadra. */
  accent: string | null;
  /** Velatura di `bg` per le superfici tenui (righe della vista giorno). */
  tint: string;
  /** Bordo delle superfici tenui. */
  tintBorder: string;
  /** Velatura piu' marcata, per l'hover delle superfici tenui. */
  tintHover: string;
}

/** Colore del TIPO di evento, dal tema (cambia in chiaro/scuro). */
export function typeColor(theme: Theme, type: CalendarEventType): string {
  return theme.palette.calendar[type];
}

/**
 * Tutti i colori di un evento in un colpo solo.
 * `teamColor` e' l'hex scelto dallo staff per la squadra (null = nessuna).
 */
export function eventVisual(
  theme: Theme,
  type: CalendarEventType,
  teamColor?: string | null
): EventVisual {
  const bg = typeColor(theme, type);
  return {
    bg,
    fg: contrastText(bg),
    accent: teamColor ?? null,
    tint: alpha(bg, 0.1),
    tintBorder: alpha(bg, 0.28),
    tintHover: alpha(bg, 0.18),
  };
}

/**
 * Fascia squadra sul bordo sinistro, con un separatore di 1px del colore del
 * foglio fra la fascia e il corpo del chip.
 *
 * Senza il separatore la fascia poggia direttamente su una tinta satura, e i
 * colori squadra non hanno la luminosita' per staccarsene: dei 48 accoppiamenti
 * fra gli otto preset del form squadra e i tre colori di tipo, nei due temi,
 * solo nove superano il 3:1 richiesto agli elementi grafici (il viola su un
 * chip allenamento in chiaro si ferma a 1,06:1, cioe' non si vede). Il
 * separatore sposta il confronto sullo sfondo della cella, dove ogni preset
 * funziona. Allargare la fascia senza separarla non serve a niente: si vedrebbe
 * piu' area dello stesso non-contrasto.
 */
export interface DecorationOptions {
  /** Colore squadra per la fascia sul bordo sinistro. */
  accent?: string | null;
  /** Larghezza della fascia. */
  bandWidth?: number;
  /**
   * Colore dell'eco esterna, quando l'elemento va marcato come "tuo".
   * Di norma e' il colore dell'elemento stesso (vedi sotto).
   */
  echo?: string | null;
  echoGap?: number;
  echoWidth?: number;
}

/**
 * Decorazioni di un chip: fascia squadra a sinistra ed eventuale eco esterna.
 * Tornano insieme perche' condividono `box-shadow` e una sola delle due
 * sovrascriverebbe l'altra.
 *
 * L'eco marca gli impegni della squadra di chi guarda. E' un secondo contorno
 * nel colore dell'elemento stesso, staccato da un filo del colore del foglio:
 * l'elemento sembra ribadito, non recintato. Prima era un contorno in
 * `text.primary`, che contro il foglio fa 17,4:1 in chiaro e 14,6:1 in scuro,
 * cioe' piu' del testo dei titoli: diventava la cosa piu' forte della pagina e
 * scavalcava proprio il contenuto che doveva mettere in evidenza. L'eco nel
 * colore del tipo sta fra 4,80:1 e 8,32:1, ben sopra il 3:1 richiesto agli
 * elementi grafici ma circa un terzo dell'intensita' di prima, e non introduce
 * una quarta tinta in una griglia che ne ha gia' tre piu' quelle delle squadre.
 *
 * Il `box-shadow` non occupa spazio nel flusso, quindi l'eco non sposta di un
 * pixel la griglia.
 */
export function decorationSx(theme: Theme, opts: DecorationOptions) {
  const { accent, bandWidth = 5, echo, echoGap = 1.5, echoWidth = 1.5 } = opts;
  const paper = theme.palette.background.paper;
  const shadows: string[] = [];

  // Separatore fra la fascia squadra e il corpo del chip. Senza, la fascia
  // poggia su una tinta satura e i colori squadra non hanno la luminosita' per
  // staccarsene: dei 48 accoppiamenti fra gli otto preset del form squadra e i
  // tre colori di tipo, nei due temi, solo nove superano il 3:1 (il viola su un
  // chip allenamento in chiaro si ferma a 1,06:1, cioe' non si vede). Il
  // separatore sposta il confronto sullo sfondo della cella, dove ogni preset
  // funziona. Allargare la fascia senza separarla mostrerebbe solo piu' area
  // dello stesso non-contrasto.
  if (accent) shadows.push(`inset 1px 0 0 ${paper}`);
  if (echo) {
    shadows.push(`0 0 0 ${echoGap}px ${paper}`, `0 0 0 ${echoGap + echoWidth}px ${echo}`);
  }

  return {
    ...(accent ? { borderLeft: `${bandWidth}px solid ${accent}` } : {}),
    ...(shadows.length ? { boxShadow: shadows.join(", ") } : {}),
  };
}

/**
 * Chiavi dei filtri della legenda. Le squadre si filtrano per ID e non per
 * colore: due squadre che hanno scelto lo stesso colore sono comunque due
 * filtri distinti.
 */
export const typeFilterKey = (type: CalendarEventType) => `type:${type}`;
export const teamFilterKey = (teamId: string) => `team:${teamId}`;
