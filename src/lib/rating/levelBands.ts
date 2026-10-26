import { ordinal, type Rating } from "./trueskill";
import { roleGroupOf, tercileThresholds, ROLE_GROUPS, type RoleGroup } from "./roleGroups";

/**
 * Fasce del livello stimato: terzo più alto, centrale, più basso (UX-40, UX-54).
 *
 * Allo staff non si mostra il numero di una persona: la fascia dice quanto
 * basta per comporre le squadre. I giocatori si confrontano dentro il proprio
 * gruppo di ruolo (sulla rosa intera i ruoli alti starebbero tutti in cima) e
 * col valore prudente (μ − 3σ), come il filtro di `/admin/sviluppo`.
 */
export type LevelBand = "alta" | "media" | "bassa";

/** Livello di un iscritto per lo staff: μ e σ solo per i calcoli, mai a schermo. */
export interface AthleteLevel {
  mu: number;
  sigma: number;
  band: LevelBand;
}

export type BandThresholds = Record<RoleGroup, { lo: number; hi: number } | null>;

/** Soglie per gruppo di ruolo, calcolate sulla rosa valutata. */
export function bandThresholds(
  roster: { sportRole: number | null; mu: number; sigma: number }[]
): BandThresholds {
  return Object.fromEntries(
    ROLE_GROUPS.map((g) => [
      g,
      tercileThresholds(
        roster
          .filter((r) => roleGroupOf(r.sportRole) === g)
          .map((r) => ordinal({ mu: r.mu, sigma: r.sigma }))
      ),
    ])
  ) as BandThresholds;
}

/** Fascia di un giocatore; con meno di tre valutati nel gruppo, centrale. */
export function levelBand(
  sportRole: number | null,
  rating: Rating,
  thresholds: BandThresholds
): LevelBand {
  const t = thresholds[roleGroupOf(sportRole)];
  if (!t) return "media";
  const ord = ordinal(rating);
  return ord >= t.hi ? "alta" : ord < t.lo ? "bassa" : "media";
}
