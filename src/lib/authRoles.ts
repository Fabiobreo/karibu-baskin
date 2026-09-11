import type { AppRole } from "@prisma/client";

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  GUEST: 0,
  ATHLETE: 1,
  PARENT: 2,
  COACH: 3,
  ADMIN: 4,
};

// Re-export for backwards compatibility — source of truth is now @/lib/constants
export { ROLE_LABELS_IT, ROLE_CHIP_COLORS } from "@/lib/constants";

export function hasRole(userRole: AppRole, required: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

export function canManageSessions(role: AppRole): boolean {
  return hasRole(role, "COACH");
}

export function canRegister(role: AppRole): boolean {
  return hasRole(role, "GUEST");
}

/**
 * Tesserato del Karibu: ATHLETE o superiore.
 *
 * Il login è aperto a chiunque abbia un account Google e un nuovo accesso nasce
 * GUEST (default dello schema): "autenticato" non vuol dire "del Karibu". I dati
 * nominativi dei tesserati, e in particolare quelli dei minori, vanno ai membri,
 * non agli ospiti né ai visitatori anonimi.
 */
export function isMemberRole(role: AppRole | string | null | undefined): boolean {
  return !!role && role in ROLE_HIERARCHY && hasRole(role as AppRole, "ATHLETE");
}
