import type { AppRole, AthleteStatus, Gender } from "@prisma/client";

export const ROLE_LABELS_IT: Record<AppRole, string> = {
  GUEST: "Ospite",
  ATHLETE: "Atleta",
  PARENT: "Genitore",
  COACH: "Allenatore",
  ADMIN: "Admin",
};

export const ROLE_CHIP_COLORS: Record<
  AppRole,
  "default" | "warning" | "info" | "success" | "error"
> = {
  GUEST: "default",
  ATHLETE: "info",
  PARENT: "success",
  COACH: "warning",
  ADMIN: "error",
};

export const GENDER_LABELS: Record<Gender, string> = { MALE: "Maschio", FEMALE: "Femmina" };
export const GENDER_LABELS_SHORT: Record<Gender, string> = { MALE: "M", FEMALE: "F" };

// Stato di attività atleta. null (attivo) non ha chip; solo i due stati non-attivi.
export const ATHLETE_STATUS_LABELS: Record<AthleteStatus, string> = {
  INACTIVE_SEASON: "In pausa",
  FORMER: "Ex atleta",
};

export const ATHLETE_STATUS_CHIP_COLORS: Record<AthleteStatus, "warning" | "default"> = {
  INACTIVE_SEASON: "warning", // pausa temporanea
  FORMER: "default", // ex atleta (grigio)
};

export const ROLE_LABELS: Record<number, string> = {
  1: "Ruolo 1",
  2: "Ruolo 2",
  3: "Ruolo 3",
  4: "Ruolo 4",
  5: "Ruolo 5",
};

// Colori dei ruoli Baskin (UX-11): puramente estetici, in palestra i ruoli non
// si distinguono per colore. Tinte tenui armonizzate col nero, scelte perche'
// non si confondano con il verde della vittoria, il rosso della sconfitta e
// degli errori, l'arancio delle azioni. Tutte reggono il testo bianco del
// badge (da 6,05:1 a 8,86:1).
// Non si importano direttamente: si passa da `roleColor` / `roleColorSx` o
// dal componente `RoleBadge`, che danno anche il colore del testo.
const ROLE_COLORS: Record<number, string> = {
  1: "#3D5A80", // blu ardesia
  2: "#2F6B73", // petrolio
  3: "#555A96", // indaco
  4: "#7A4E7A", // prugna
  5: "#4A4A4A", // grafite
};

/** Colore di testo sopra un riempimento `roleColor` (sempre bianco). */
export const ROLE_TEXT_COLOR = "common.white";

/** Colore del ruolo (pallini, bordi, fasce), o `undefined` se il ruolo non c'e'. */
export function roleColor(role: number | null | undefined): string | undefined {
  return role == null ? undefined : ROLE_COLORS[role];
}

/** Riempimento del ruolo con il suo colore di testo, da spargere in `sx`. */
export function roleColorSx(role: number | null | undefined) {
  return { bgcolor: roleColor(role), color: ROLE_TEXT_COLOR } as const;
}

export const ROLES = [1, 2, 3, 4, 5] as const;
export type Role = (typeof ROLES)[number];

/** Numero minimo di convocati per disputare una partita di Baskin. */
export const MIN_CALLUPS = 6;

/**
 * Gruppi di ruoli per il calcolo della copertura.
 * I ruoli 1 e 2 sono unificati perché interscambiabili a livello tattico
 * (non è detto che una squadra abbia atleti di ruolo 1).
 * `roles` è la lista dei sportRole inclusi nel gruppo.
 */
export const ROLE_GROUPS = [
  { key: "1-2", label: "Ruolo 1-2", roles: [1, 2] as number[], min: 3 },
  { key: "3", label: "Ruolo 3", roles: [3] as number[], min: 2 },
  { key: "4", label: "Ruolo 4", roles: [4] as number[], min: 1 },
  { key: "5", label: "Ruolo 5", roles: [5] as number[], min: 1 },
] as const;

export type RoleGroupKey = (typeof ROLE_GROUPS)[number]["key"];

/** Risale al gruppo di un dato sportRole (1-5). */
export function roleGroupOf(role: number | null | undefined): RoleGroupKey | null {
  if (role == null) return null;
  const g = ROLE_GROUPS.find((g) => g.roles.includes(role));
  return g ? g.key : null;
}

export const TEAM_META = [
  { key: "teamA" as const, name: "Arancioni", color: "#E65100" },
  { key: "teamB" as const, name: "Neri", color: "#1A1A1A" },
  { key: "teamC" as const, name: "Bianchi", color: "#757575" },
] as const;

// Varianti del ruolo sportivo (es. 1S, 2T, 2P, 2R)
export const SPORT_ROLE_VARIANT_LABELS: Record<string, string> = {
  S: "con spasticità",
  T: "con assistenza tutor",
  P: "con limitazioni arti superiori",
  R: "con corsa limitata",
};

/** Restituisce la label completa del ruolo, es. "Ruolo 2T" */
export function sportRoleLabel(role: number, variant?: string | null): string {
  return `Ruolo ${role}${variant ?? ""}`;
}
