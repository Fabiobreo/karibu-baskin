import type { AppRole, AthleteStatus, Gender } from "@prisma/client";
import { BIB, BRAND } from "@/lib/palette";

export const ROLE_LABELS_IT: Record<AppRole, string> = {
  GUEST: "Ospite",
  ATHLETE: "Atleta",
  PARENT: "Genitore",
  COACH: "Allenatore",
  ADMIN: "Admin",
};

export const GENDER_LABELS: Record<Gender, string> = { MALE: "Maschio", FEMALE: "Femmina" };
export const GENDER_LABELS_SHORT: Record<Gender, string> = { MALE: "M", FEMALE: "F" };

// Stato di attività atleta. null (attivo) non ha chip; solo i due stati non-attivi.
export const ATHLETE_STATUS_LABELS: Record<AthleteStatus, string> = {
  INACTIVE_SEASON: "In pausa",
  FORMER: "Ex atleta",
};

export const ROLE_LABELS: Record<number, string> = {
  1: "Ruolo 1",
  2: "Ruolo 2",
  3: "Ruolo 3",
  4: "Ruolo 4",
  5: "Ruolo 5",
};

// Colore dei ruoli Baskin (UX-29): grafite per tutti i ruoli, scelta del
// committente. In palestra i ruoli non si distinguono per colore e
// l'informazione e' il numero; le cinque tinte di prima (UX-11) erano le stesse
// famiglie delle tinte squadra, e accanto al nome di un giocatore un "3" indaco
// e una squadra indaco dicevano due cose diverse con lo stesso colore.
// Si passa da `roleColorSx` o dal componente `RoleBadge`.

/** Riempimento grafite del badge del ruolo con il suo testo bianco, da spargere in `sx`. */
export function roleColorSx(role: number | null | undefined) {
  return { bgcolor: role == null ? undefined : "role.main", color: "role.contrastText" } as const;
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

// Casacche d'allenamento: colori veri delle maglie (eccezione dichiarata di
// UX-29, sempre accompagnati dal nome). `fill` e' la stessa casacca come
// riempimento sotto un'etichetta bianca: l'arancio della maglia col bianco si
// ferma a 3,78:1, il riempimento arancio del marchio arriva a 4,71:1.
export const TEAM_META = [
  { key: "teamA" as const, name: "Arancioni", color: BIB.orange, fill: BRAND.orangeFill },
  { key: "teamB" as const, name: "Neri", color: BIB.black, fill: BIB.black },
  { key: "teamC" as const, name: "Bianchi", color: BIB.white, fill: BIB.white },
] as const;

/** Riempimento di una casacca sotto un'etichetta bianca (>= 4,5:1), dal suo colore. */
export function bibFill(color: string): string {
  return TEAM_META.find((t) => t.color === color)?.fill ?? color;
}

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
