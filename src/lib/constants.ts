import type { Gender } from "@prisma/client";

export const GENDER_LABELS: Record<Gender, string> = { MALE: "Maschio", FEMALE: "Femmina" };
export const GENDER_LABELS_SHORT: Record<Gender, string> = { MALE: "M", FEMALE: "F" };

export const ROLE_LABELS: Record<number, string> = {
  1: "Ruolo 1",
  2: "Ruolo 2",
  3: "Ruolo 3",
  4: "Ruolo 4",
  5: "Ruolo 5",
};

export const ROLE_COLORS: Record<number, string> = {
  1: "#1565C0", // blu scuro
  2: "#2E7D32", // verde scuro
  3: "#E65100", // arancio scuro
  4: "#6A1B9A", // viola
  5: "#C62828", // rosso scuro
};

export const ROLES = [1, 2, 3, 4, 5] as const;
export type Role = (typeof ROLES)[number];

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
