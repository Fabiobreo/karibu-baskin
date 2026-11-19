import type { TeamsData } from "@/lib/schemas/session";
import type { DrillAssignments } from "@/lib/schemas/drill";
import { assignSlots, type SlotTeam } from "./assign";
import type { DrillContent } from "./content";

/**
 * I nomi sulle pedine di uno schema dentro un allenamento (UX-72). Funzione
 * pura: la usano la pagina dell'allenamento e il dialog della scaletta.
 */

export type TrainingTeamKey = "teamA" | "teamB" | "teamC";
const KEYS: TrainingTeamKey[] = ["teamA", "teamB", "teamC"];

/** Le squadre dell'allenamento che ci sono davvero, in ordine. */
export function trainingTeamKeys(teams: TeamsData | null): TrainingTeamKey[] {
  if (!teams) return [];
  return KEYS.filter((k) => (teams[k]?.length ?? 0) > 0);
}

/**
 * Chi difende quando attacca `attack`: la squadra dopo, in giro (con tre
 * squadre: A contro B, B contro C, C contro A).
 */
export function opponentKey(
  teams: TeamsData | null,
  attack: TrainingTeamKey
): TrainingTeamKey | null {
  const keys = trainingTeamKeys(teams);
  if (keys.length < 2) return null;
  const i = keys.indexOf(attack);
  return keys[(i + 1) % keys.length];
}

export function slotTeam(teams: TeamsData | null, key: TrainingTeamKey | null): SlotTeam | null {
  if (!teams || !key) return null;
  return { key, athletes: teams[key] ?? [] };
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** Nome sulla pedina: il nome di battesimo, con "Tu" o in evidenza per la famiglia. */
export interface TrainingPieceName {
  athleteId: string;
  name: string;
  me?: boolean;
  family?: boolean;
}

export function trainingPieceNames(
  content: DrillContent,
  options: {
    teams: TeamsData | null;
    attack: TrainingTeamKey | null;
    assignments: DrillAssignments | null;
    seed: string;
    /** Iscrizione → "self" (chi guarda) o "family" (un figlio). */
    marks?: Record<string, "self" | "family">;
  }
): Record<string, TrainingPieceName> {
  const { teams, attack } = options;
  if (!teams || !attack) return {};
  const slots = assignSlots(content, {
    attack: slotTeam(teams, attack),
    defense: slotTeam(teams, opponentKey(teams, attack)),
    assignments: options.assignments,
    seed: options.seed,
  });
  return Object.fromEntries(
    Object.entries(slots).map(([pieceId, athlete]) => {
      const mark = options.marks?.[athlete.id];
      return [
        pieceId,
        {
          athleteId: athlete.id,
          name: firstName(athlete.name),
          me: mark === "self",
          family: mark === "family",
        },
      ];
    })
  );
}
