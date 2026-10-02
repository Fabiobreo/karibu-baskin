/**
 * Le azioni di una riga di `/admin/partite` (UX-40): una sola con l'etichetta,
 * scelta da cosa manca alla partita, e le altre nel menu "⋯". Prima ogni riga
 * aveva cinque icone senza nome, uguali per una partita di domani e per una di
 * sei mesi fa.
 *
 * Chi guarda conta: convocare lo fa anche l'allenatore, mentre risultato,
 * statistiche, scheda avversario, modifica ed eliminazione sono dell'admin
 * (così dicono le API). Un'azione che darebbe errore non si mostra.
 */
export type MatchRowActionKey =
  | "callups"
  | "result"
  | "stats"
  | "profile"
  | "edit"
  | "public"
  | "delete";

export interface MatchRowAction {
  key: MatchRowActionKey;
  label: string;
}

export interface MatchRowPrimaryAction extends MatchRowAction {
  /** `outlined` quando c'è qualcosa da fare, `text` quando si va solo a vedere. */
  emphasis: "outlined" | "text";
}

export interface MatchRowState {
  /** La partita deve ancora giocarsi. */
  upcoming: boolean;
  hasResult: boolean;
  hasStats: boolean;
  /** Convocati salvati (in un'amichevole interna: delle due squadre insieme). */
  callups: number;
  /** Amichevole fra due squadre nostre. */
  isInternal: boolean;
  /** L'avversaria è una squadra dell'anagrafica (ha una scheda). */
  hasOpponent: boolean;
  /** La scheda avversario è già compilata. */
  hasProfile: boolean;
  isAdmin: boolean;
}

function callupsLabel({ callups, isInternal, upcoming }: MatchRowState): string {
  if (callups === 0) return upcoming ? "Convoca" : "Convocati";
  // In un'amichevole interna il numero somma le due squadre: direbbe "24".
  return isInternal ? "Convocati" : `Convocati (${callups})`;
}

export function matchPrimaryAction(state: MatchRowState): MatchRowPrimaryAction {
  const callups: MatchRowPrimaryAction = {
    key: "callups",
    label: callupsLabel(state),
    emphasis: state.upcoming && state.callups === 0 ? "outlined" : "text",
  };
  if (state.upcoming || !state.isAdmin) return callups;
  if (!state.hasResult) {
    return { key: "result", label: "Inserisci risultato", emphasis: "outlined" };
  }
  if (!state.hasStats) {
    return { key: "stats", label: "Inserisci statistiche", emphasis: "outlined" };
  }
  return { key: "stats", label: "Statistiche", emphasis: "text" };
}

/** Le voci del menu "⋯", senza quella già in riga. "Elimina" è sempre l'ultima. */
export function matchMenuActions(state: MatchRowState): MatchRowAction[] {
  const primary = matchPrimaryAction(state).key;
  const items: MatchRowAction[] = [{ key: "callups", label: callupsLabel(state) }];
  if (state.isAdmin) {
    if (!state.upcoming) {
      items.push({
        key: "result",
        label: state.hasResult ? "Modifica risultato" : "Inserisci risultato",
      });
      items.push({ key: "stats", label: "Statistiche giocatori" });
    }
    if (state.hasResult && state.hasOpponent) {
      items.push({
        key: "profile",
        label: state.hasProfile ? "Modifica scheda avversario" : "Scheda avversario",
      });
    }
    items.push({ key: "edit", label: "Modifica partita" });
  }
  items.push({ key: "public", label: "Pagina pubblica" });
  if (state.isAdmin) items.push({ key: "delete", label: "Elimina partita…" });
  return items.filter((i) => i.key !== primary);
}
