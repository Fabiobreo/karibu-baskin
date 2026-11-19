import { seededShuffle, stringToSeed } from "@/lib/seededRandom";
import type { DrillContent, PieceSide } from "./content";

/**
 * Chi va dove (UX-72): le pedine di ruolo di uno schema prendono i nomi dei
 * giocatori di una squadra dell'allenamento. Funzione pura, usata dal server
 * (pagina dell'allenamento) e dal pannello (dialog della scaletta).
 *
 * - Le pedine d'attacco prendono la squadra scelta, quelle di difesa l'altra.
 * - A ogni pedina un giocatore con lo stesso ruolo Baskin, nell'ordine dei
 *   pezzi; a parita' di ruolo l'ordine viene dal seme, cosi' ricaricando la
 *   pagina i nomi non cambiano.
 * - Prima valgono gli scambi salvati dallo staff, se il giocatore e' ancora in
 *   quella squadra; quelli che non valgono piu' si ignorano.
 * - Se i ruoli non bastano la pedina resta senza nome (mostra il numero);
 *   pedine senza ruolo, allenatore e materiali non prendono mai nomi.
 */

export interface SlotAthlete {
  id: string;
  name: string;
  role: number;
}

export interface SlotTeam {
  /** `teamA`, `teamB`, `teamC`: la chiave degli scambi salvati. */
  key: string;
  athletes: readonly SlotAthlete[];
}

export interface AssignInput {
  attack: SlotTeam | null;
  defense: SlotTeam | null;
  /** Scambi dello staff: squadra → pezzo → id dell'atleta. */
  assignments?: Record<string, Record<string, string>> | null;
  /** Per esempio `sessionId:drillId`. */
  seed: string;
}

/** Pezzo → atleta. I pezzi senza nome non compaiono. */
export type SlotAssignment = Record<string, SlotAthlete>;

export function assignSlots(content: DrillContent, input: AssignInput): SlotAssignment {
  const result: SlotAssignment = {};
  for (const side of ["attack", "defense"] as const) {
    const team = input[side];
    if (!team) continue;
    Object.assign(result, assignSide(content, side, team, input));
  }
  return result;
}

function assignSide(
  content: DrillContent,
  side: PieceSide,
  team: SlotTeam,
  input: AssignInput
): SlotAssignment {
  const slots = content.pieces.filter((p) => p.kind === "role" && p.side === side);
  const byId = new Map(team.athletes.map((a) => [a.id, a]));
  const overrides = input.assignments?.[team.key] ?? {};
  const used = new Set<string>();
  const result: SlotAssignment = {};

  for (const slot of slots) {
    const athlete = byId.get(overrides[slot.id] ?? "");
    if (athlete && !used.has(athlete.id)) {
      result[slot.id] = athlete;
      used.add(athlete.id);
    }
  }

  const queues = new Map<number, SlotAthlete[]>();
  const queueFor = (role: number) => {
    let q = queues.get(role);
    if (!q) {
      const sameRole = team.athletes.filter((a) => a.role === role);
      q = seededShuffle(sameRole, stringToSeed(`${input.seed}:${team.key}:${role}`));
      queues.set(role, q);
    }
    return q;
  };

  for (const slot of slots) {
    if (result[slot.id] || slot.role === undefined) continue;
    const athlete = queueFor(slot.role).find((a) => !used.has(a.id));
    if (athlete) {
      result[slot.id] = athlete;
      used.add(athlete.id);
    }
  }
  return result;
}
