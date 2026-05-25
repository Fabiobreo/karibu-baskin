export type ControllableNotifType = "NEW_TRAINING" | "TEAMS_READY" | "MATCH_RESULT" | "NEW_POST";

export const CONTROLLABLE_TYPES: ControllableNotifType[] = [
  "NEW_TRAINING",
  "TEAMS_READY",
  "MATCH_RESULT",
  "NEW_POST",
];

export const NOTIF_TYPE_LABELS: Record<ControllableNotifType, string> = {
  NEW_TRAINING: "Nuovo allenamento",
  TEAMS_READY: "Squadre pronte",
  MATCH_RESULT: "Risultato partita",
  NEW_POST: "Nuova news / sondaggio",
};

export const NOTIF_TYPE_DESC: Record<ControllableNotifType, string> = {
  NEW_TRAINING: "Quando viene creato un nuovo allenamento",
  TEAMS_READY: "Quando le squadre per un allenamento a cui sei iscritto/a sono pronte",
  MATCH_RESULT: "Quando viene inserito il risultato di una partita",
  NEW_POST: "Quando viene pubblicato un articolo o un sondaggio nella bacheca",
};

export interface NotifPrefs {
  push: Record<ControllableNotifType, boolean>;
  inApp: Record<ControllableNotifType, boolean>;
}

export const DEFAULT_PREFS: NotifPrefs = {
  push: { NEW_TRAINING: true, TEAMS_READY: true, MATCH_RESULT: true, NEW_POST: true },
  inApp: { NEW_TRAINING: true, TEAMS_READY: true, MATCH_RESULT: true, NEW_POST: true },
};

export function mergePrefs(stored: unknown): NotifPrefs {
  if (!stored || typeof stored !== "object") return DEFAULT_PREFS;
  const s = stored as Partial<NotifPrefs>;
  return {
    push: { ...DEFAULT_PREFS.push, ...(s.push ?? {}) },
    inApp: { ...DEFAULT_PREFS.inApp, ...(s.inApp ?? {}) },
  };
}
