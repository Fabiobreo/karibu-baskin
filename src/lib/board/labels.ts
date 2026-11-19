import type { DrillCourt, DrillKind, DrillVisibility } from "@prisma/client";

/** Etichette del Playbook nel pannello (UX-72): il pannello e' solo in italiano. */
export const DRILL_KIND_LABELS: Record<DrillKind, string> = {
  ATTACK: "Attacco",
  DEFENSE: "Difesa",
  TRANSITION: "Transizione",
  SET_PLAY: "Rimessa o palla ferma",
  EXERCISE: "Esercizio",
  WARMUP: "Riscaldamento",
};

export const DRILL_CATEGORY_LABELS = { exercises: "Esercizi", plays: "Schemi" } as const;

export const DRILL_VISIBILITY_LABELS: Record<DrillVisibility, string> = {
  MEMBERS: "Solo tesserati",
  PUBLIC: "Tutti, anche su Google",
};

export const DRILL_COURT_LABELS: Record<DrillCourt, string> = {
  FULL: "Campo intero",
  HALF: "Metà campo",
};

/** Riga dell'elenco del pannello e dati dell'editor. */
export interface AdminDrillRow {
  id: string;
  slug: string;
  title: string;
  kind: DrillKind;
  court: DrillCourt;
  description: string | null;
  durationMin: number | null;
  competitiveTeamId: string | null;
  visibility: DrillVisibility;
  status: "DRAFT" | "PUBLISHED";
  archived: boolean;
  usedIn: number;
  updatedAt: string;
  updatedBy: string | null;
}

/** Squadra fra cui scegliere quella di riferimento. */
export interface DrillTeamOption {
  id: string;
  name: string;
  season: string;
}
