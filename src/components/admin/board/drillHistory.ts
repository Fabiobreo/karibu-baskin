import type { DrillContent } from "@/lib/board/content";

/**
 * Storia dell'editor della lavagna (UX-72), per Annulla e Ripeti. Durante un
 * trascinamento i movimenti sono "live" (non entrano nella storia): all'inizio
 * del trascinamento si salva un punto di ritorno, cosi' Annulla riporta il
 * pezzo dov'era prima di tutto il gesto.
 */
export interface DrillHistory {
  content: DrillContent;
  past: DrillContent[];
  future: DrillContent[];
}

export type DrillHistoryAction =
  | { type: "apply"; fn: (c: DrillContent) => DrillContent }
  | { type: "live"; fn: (c: DrillContent) => DrillContent }
  | { type: "checkpoint" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "replace"; content: DrillContent };

const MAX_HISTORY = 100;

const push = (past: DrillContent[], c: DrillContent) => [...past, c].slice(-MAX_HISTORY);

export function drillHistoryReducer(state: DrillHistory, action: DrillHistoryAction): DrillHistory {
  switch (action.type) {
    case "apply": {
      const next = action.fn(state.content);
      if (next === state.content) return state;
      return { content: next, past: push(state.past, state.content), future: [] };
    }
    case "live": {
      const next = action.fn(state.content);
      return next === state.content ? state : { ...state, content: next };
    }
    case "checkpoint":
      return { ...state, past: push(state.past, state.content), future: [] };
    case "undo": {
      const prev = state.past.at(-1);
      if (!prev) return state;
      return {
        content: prev,
        past: state.past.slice(0, -1),
        future: [state.content, ...state.future],
      };
    }
    case "redo": {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return { content: next, past: push(state.past, state.content), future: rest };
    }
    case "replace":
      return { content: action.content, past: push(state.past, state.content), future: [] };
  }
}
