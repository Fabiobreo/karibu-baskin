import type { DrillKind, DrillVisibility } from "@prisma/client";

/**
 * Le due macrocategorie del Playbook (UX-72): gli **esercizi** (riscaldamento,
 * esercizi d'allenamento) e gli **schemi** (il nostro gioco da partita). La
 * categoria si ricava dal tipo, non si salva.
 *
 * Un esercizio puo' essere pubblico, per scelta esplicita dello staff, e allora
 * lo vede chiunque e puo' finire su Google. Uno schema resta sempre dei
 * tesserati: e' il modo in cui giochiamo le partite.
 */

export type DrillCategory = "exercises" | "plays";

export const EXERCISE_KINDS: readonly DrillKind[] = ["WARMUP", "EXERCISE"];
export const PLAY_KINDS: readonly DrillKind[] = ["ATTACK", "DEFENSE", "TRANSITION", "SET_PLAY"];

export function drillCategory(kind: DrillKind): DrillCategory {
  return EXERCISE_KINDS.includes(kind) ? "exercises" : "plays";
}

export function kindsOf(category: DrillCategory): readonly DrillKind[] {
  return category === "exercises" ? EXERCISE_KINDS : PLAY_KINDS;
}

/** Solo un esercizio puo' essere pubblico. */
export function canBePublic(kind: DrillKind): boolean {
  return drillCategory(kind) === "exercises";
}

/** La visibilita' che vale davvero: uno schema e' dei tesserati anche se il dato dice altro. */
export function effectiveVisibility(kind: DrillKind, visibility: DrillVisibility): DrillVisibility {
  return canBePublic(kind) ? visibility : "MEMBERS";
}

/** Indirizzi pubblici del Playbook. */
export const PLAYBOOK_PATH = "/playbook";
export const CATEGORY_SEGMENT: Record<DrillCategory, string> = {
  exercises: "esercizi",
  plays: "schemi",
};
export const categoryPath = (category: DrillCategory) =>
  `${PLAYBOOK_PATH}/${CATEGORY_SEGMENT[category]}`;
export const drillPath = (slug: string) => `${PLAYBOOK_PATH}/${slug}`;

/** Slug che non si possono dare a uno schema: sono le pagine delle due categorie. */
export const RESERVED_DRILL_SLUGS: readonly string[] = Object.values(CATEGORY_SEGMENT);
