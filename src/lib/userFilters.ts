import type { AppRole, Prisma } from "@prisma/client";

/**
 * Filtri a scelta multipla di /admin/utenti nell'URL: valori separati da
 * virgola (`?sportRole=4,5`, `?appRole=ATHLETE,PARENT`), cosi' si vedono
 * insieme piu' ruoli. Un link vecchio con un valore solo resta valido.
 * `sportRole=none` = senza ruolo Baskin, combinabile con i numeri.
 */

const APP_ROLES: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "DIRECTOR", "COACH", "ADMIN"];

const split = (raw: string | undefined) =>
  (raw ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

export function parseAppRoles(raw: string | undefined): AppRole[] {
  return [...new Set(split(raw).filter((v): v is AppRole => APP_ROLES.includes(v as AppRole)))];
}

/** Valori validi di ruolo Baskin: "none" e 1-5, come stringhe (uguali ai chip). */
export function parseSportRoles(raw: string | undefined): string[] {
  return [...new Set(split(raw).filter((v) => v === "none" || /^[1-5]$/.test(v)))];
}

/** Condizione Prisma per i ruoli Baskin scelti (null = nessun filtro). */
export function sportRoleWhere(values: string[]): Prisma.UserWhereInput | null {
  if (values.length === 0) return null;
  const numbers = values.filter((v) => v !== "none").map(Number);
  const or: Prisma.UserWhereInput[] = [];
  if (values.includes("none")) or.push({ sportRole: null });
  if (numbers.length > 0) or.push({ sportRole: { in: numbers } });
  return or.length === 1 ? or[0] : { OR: or };
}

/** Per l'URL: stessa forma che legge `parse*`. */
export const joinFilter = (values: string[]) => values.join(",");
