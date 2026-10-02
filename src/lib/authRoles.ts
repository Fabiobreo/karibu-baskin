import type { AppRole } from "@prisma/client";

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  GUEST: 0,
  ATHLETE: 1,
  PARENT: 2,
  COACH: 3,
  ADMIN: 4,
};

// Re-export for backwards compatibility — source of truth is now @/lib/constants
export { ROLE_LABELS_IT } from "@/lib/constants";

export function hasRole(userRole: AppRole, required: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

export function canManageSessions(role: AppRole): boolean {
  return hasRole(role, "COACH");
}

export function canRegister(role: AppRole): boolean {
  return hasRole(role, "GUEST");
}

export const ALL_APP_ROLES = Object.keys(ROLE_HIERARCHY) as AppRole[];

interface AppRoleChange {
  /** Ruolo di chi fa la modifica. */
  actorRole: AppRole;
  /** Vero se chi fa la modifica è la persona stessa. */
  isSelf: boolean;
  current: AppRole;
  next: AppRole;
}

/**
 * Chi può assegnare quale ruolo utente (UX-40, passo 0).
 *
 * L'admin assegna qualunque ruolo, tranne il proprio: un admin che si toglie il
 * ruolo per sbaglio non può più rimetterselo. L'allenatore approva soltanto i
 * nuovi account, da ospite ad atleta o genitore: prima poteva promuovere
 * chiunque ad admin, sé compreso. Lasciare il ruolo com'è è sempre permesso (la
 * scheda utente lo rimanda uguale insieme agli altri campi).
 */
export function canAssignAppRole({ actorRole, isSelf, current, next }: AppRoleChange): boolean {
  if (next === current) return true;
  if (isSelf) return false;
  if (actorRole === "ADMIN") return true;
  if (actorRole === "COACH") {
    return current === "GUEST" && (next === "ATHLETE" || next === "PARENT");
  }
  return false;
}

/** I ruoli fra cui chi guarda può scegliere per una persona (quello attuale compreso). */
export function assignableAppRoles(change: Omit<AppRoleChange, "next">): AppRole[] {
  return ALL_APP_ROLES.filter((next) => canAssignAppRole({ ...change, next }));
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
